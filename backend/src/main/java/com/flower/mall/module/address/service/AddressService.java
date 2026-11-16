package com.flower.mall.module.address.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.address.dto.AddressSaveRequest;
import com.flower.mall.module.address.dto.AddressVO;
import com.flower.mall.module.address.entity.UserAddress;
import com.flower.mall.module.address.mapper.UserAddressMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AddressService {

    private static final int MAX_ADDRESSES = 10;
    private static final String DEFAULT_LABEL = "家";

    private final UserAddressMapper addressMapper;

    public List<AddressVO> list() {
        Long userId = SecurityUtils.currentUserId();
        return addressMapper.selectList(Wrappers.<UserAddress>lambdaQuery()
                        .eq(UserAddress::getUserId, userId)
                        .orderByDesc(UserAddress::getIsDefault)
                        .orderByDesc(UserAddress::getUpdatedAt)
                        .orderByDesc(UserAddress::getId))
                .stream()
                .map(AddressVO::from)
                .toList();
    }

    public AddressVO detail(Long id) {
        return AddressVO.from(getOwned(id, SecurityUtils.currentUserId()));
    }

    @Transactional
    public AddressVO create(AddressSaveRequest request) {
        Long userId = SecurityUtils.currentUserId();
        Long count = addressMapper.selectCount(Wrappers.<UserAddress>lambdaQuery()
                .eq(UserAddress::getUserId, userId));
        if (count >= MAX_ADDRESSES) {
            throw BusinessException.of(ErrorCode.ADDRESS_LIMIT_EXCEEDED);
        }
        validateCoordinates(request);
        boolean makeDefault = count == 0 || Boolean.TRUE.equals(request.getIsDefault());
        if (makeDefault) {
            clearDefault(userId);
        }
        UserAddress address = new UserAddress();
        address.setUserId(userId);
        applyRequest(address, request);
        address.setIsDefault(makeDefault ? 1 : 0);
        addressMapper.insert(address);
        return AddressVO.from(addressMapper.selectById(address.getId()));
    }

    @Transactional
    public AddressVO update(Long id, AddressSaveRequest request) {
        Long userId = SecurityUtils.currentUserId();
        UserAddress address = getOwned(id, userId);
        validateCoordinates(request);
        boolean wasDefault = Integer.valueOf(1).equals(address.getIsDefault());
        boolean makeDefault = Boolean.TRUE.equals(request.getIsDefault()) || wasDefault;
        if (Boolean.TRUE.equals(request.getIsDefault())) {
            clearDefault(userId);
        }
        applyRequest(address, request);
        address.setIsDefault(makeDefault ? 1 : 0);
        addressMapper.updateById(address);
        return AddressVO.from(addressMapper.selectById(id));
    }

    @Transactional
    public AddressVO setDefault(Long id) {
        Long userId = SecurityUtils.currentUserId();
        UserAddress address = getOwned(id, userId);
        if (!Integer.valueOf(1).equals(address.getIsDefault())) {
            clearDefault(userId);
            address.setIsDefault(1);
            addressMapper.updateById(address);
        }
        return AddressVO.from(addressMapper.selectById(id));
    }

    @Transactional
    public void delete(Long id) {
        Long userId = SecurityUtils.currentUserId();
        UserAddress address = getOwned(id, userId);
        addressMapper.deleteById(id);
        if (!Integer.valueOf(1).equals(address.getIsDefault())) {
            return;
        }
        List<UserAddress> remaining = addressMapper.selectList(Wrappers.<UserAddress>lambdaQuery()
                .eq(UserAddress::getUserId, userId)
                .orderByDesc(UserAddress::getUpdatedAt)
                .orderByDesc(UserAddress::getId)
                .last("LIMIT 1"));
        if (!remaining.isEmpty()) {
            UserAddress next = remaining.get(0);
            next.setIsDefault(1);
            addressMapper.updateById(next);
        }
    }

    public AddressVO resolveForOrder(Long userId, Long addressId) {
        return AddressVO.from(getOwned(addressId, userId));
    }

    private UserAddress getOwned(Long id, Long userId) {
        UserAddress address = addressMapper.selectOne(Wrappers.<UserAddress>lambdaQuery()
                .eq(UserAddress::getId, id)
                .eq(UserAddress::getUserId, userId));
        if (address == null) {
            throw BusinessException.of(ErrorCode.ADDRESS_NOT_FOUND);
        }
        return address;
    }

    private void clearDefault(Long userId) {
        addressMapper.update(null, Wrappers.<UserAddress>lambdaUpdate()
                .eq(UserAddress::getUserId, userId)
                .eq(UserAddress::getIsDefault, 1)
                .set(UserAddress::getIsDefault, 0)
                .set(UserAddress::getUpdatedAt, LocalDateTime.now()));
    }

    private void applyRequest(UserAddress address, AddressSaveRequest request) {
        address.setReceiverName(request.getReceiverName().trim());
        address.setReceiverPhone(request.getReceiverPhone().trim());
        address.setLabel(StringUtils.hasText(request.getLabel())
                ? request.getLabel().trim()
                : DEFAULT_LABEL);
        address.setProvince(trimToNull(request.getProvince()));
        address.setCity(trimToNull(request.getCity()));
        address.setDistrict(trimToNull(request.getDistrict()));
        address.setDetailAddress(request.getDetailAddress().trim());
        address.setFormattedAddress(trimToNull(request.getFormattedAddress()));
        address.setLongitude(request.getLongitude());
        address.setLatitude(request.getLatitude());
    }

    private void validateCoordinates(AddressSaveRequest request) {
        if ((request.getLongitude() == null) != (request.getLatitude() == null)) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "经度和纬度需要同时提供");
        }
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}

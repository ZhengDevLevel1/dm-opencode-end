package com.flower.mall.module.tag.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.enums.TagType;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.module.tag.dto.TagCreateRequest;
import com.flower.mall.module.tag.dto.TagMaxCountRequest;
import com.flower.mall.module.tag.dto.TagOptionVO;
import com.flower.mall.module.tag.dto.TagOverviewVO;
import com.flower.mall.module.tag.dto.TagUpdateRequest;
import com.flower.mall.module.tag.entity.TagOption;
import com.flower.mall.module.tag.entity.TagTypeSetting;
import com.flower.mall.module.tag.mapper.TagOptionMapper;
import com.flower.mall.module.tag.mapper.TagTypeSettingMapper;
import com.flower.mall.module.tag.support.TagDefaults;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class TagService {

    private static final Pattern TAG_SEPARATOR = Pattern.compile("[,，、;；/|\\s]+");
    private static final Map<TagType, Integer> DEFAULT_MAX_COUNTS = Map.of(
            TagType.OCCASION, 8,
            TagType.FESTIVAL, 6,
            TagType.MEANING, 6);

    private final TagOptionMapper optionMapper;
    private final TagTypeSettingMapper settingMapper;

    public TagOverviewVO overview() {
        ensureInitialized();
        Map<String, Integer> maxCounts = new LinkedHashMap<>();
        for (TagType type : TagType.values()) {
            maxCounts.put(type.getKey(), maxCount(type));
        }
        return TagOverviewVO.builder()
                .occasions(options(TagType.OCCASION))
                .festivals(options(TagType.FESTIVAL))
                .flowerMeanings(options(TagType.MEANING))
                .maxCounts(maxCounts)
                .build();
    }

    public List<String> names(TagType type) {
        ensureInitialized();
        return optionMapper.selectList(Wrappers.<TagOption>lambdaQuery()
                        .eq(TagOption::getTagType, type.name())
                        .orderByAsc(TagOption::getSortOrder)
                        .orderByAsc(TagOption::getId))
                .stream()
                .map(TagOption::getName)
                .toList();
    }

    public List<TagOptionVO> options(TagType type) {
        ensureInitialized();
        return optionMapper.selectList(Wrappers.<TagOption>lambdaQuery()
                        .eq(TagOption::getTagType, type.name())
                        .orderByAsc(TagOption::getSortOrder)
                        .orderByAsc(TagOption::getId))
                .stream()
                .map(TagOptionVO::from)
                .toList();
    }

    public int maxCount(TagType type) {
        TagTypeSetting setting = settingMapper.selectById(type.name());
        return setting == null || setting.getMaxSelectCount() == null
                ? DEFAULT_MAX_COUNTS.get(type)
                : setting.getMaxSelectCount();
    }

    public void validateSelection(TagType type, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        long count = TAG_SEPARATOR.splitAsStream(value).filter(item -> !item.isBlank()).count();
        int max = maxCount(type);
        if (count > max) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST,
                    type.getLabel() + "最多选择 " + max + " 个");
        }
    }

    @Transactional
    public TagOptionVO create(TagCreateRequest request) {
        ensureInitialized();
        TagType type = TagType.fromValue(request.getType());
        String name = request.getName().trim();
        if (optionMapper.selectCount(Wrappers.<TagOption>lambdaQuery()
                .eq(TagOption::getTagType, type.name())
                .eq(TagOption::getName, name)) > 0) {
            throw BusinessException.of(ErrorCode.CONFLICT, "该标签已存在");
        }
        Integer maxSort = optionMapper.selectList(Wrappers.<TagOption>lambdaQuery()
                        .eq(TagOption::getTagType, type.name())
                        .orderByDesc(TagOption::getSortOrder)
                        .last("LIMIT 1"))
                .stream()
                .map(TagOption::getSortOrder)
                .filter(value -> value != null)
                .findFirst()
                .orElse(0);
        TagOption option = new TagOption();
        option.setTagType(type.name());
        option.setName(name);
        option.setSortOrder(maxSort + 1);
        try {
            optionMapper.insert(option);
        } catch (DuplicateKeyException exception) {
            throw BusinessException.of(ErrorCode.CONFLICT, "该标签已存在");
        }
        return TagOptionVO.from(option);
    }

    @Transactional
    public TagOptionVO rename(Long id, TagUpdateRequest request) {
        TagOption option = optionMapper.selectById(id);
        if (option == null) {
            throw BusinessException.of(ErrorCode.NOT_FOUND, "标签不存在");
        }
        String name = request.getName().trim();
        if (optionMapper.selectCount(Wrappers.<TagOption>lambdaQuery()
                .eq(TagOption::getTagType, option.getTagType())
                .eq(TagOption::getName, name)
                .ne(TagOption::getId, id)) > 0) {
            throw BusinessException.of(ErrorCode.CONFLICT, "该标签已存在");
        }
        option.setName(name);
        try {
            optionMapper.updateById(option);
        } catch (DuplicateKeyException exception) {
            throw BusinessException.of(ErrorCode.CONFLICT, "该标签已存在");
        }
        return TagOptionVO.from(option);
    }

    @Transactional
    public void delete(Long id) {
        if (optionMapper.deleteById(id) == 0) {
            throw BusinessException.of(ErrorCode.NOT_FOUND, "标签不存在");
        }
    }

    @Transactional
    public int updateMaxCount(TagMaxCountRequest request) {
        TagType type = TagType.fromValue(request.getType());
        TagTypeSetting setting = settingMapper.selectById(type.name());
        boolean create = setting == null;
        if (create) {
            setting = new TagTypeSetting();
            setting.setTagType(type.name());
        }
        setting.setMaxSelectCount(request.getMaxCount());
        try {
            if (create) {
                settingMapper.insert(setting);
            } else {
                settingMapper.updateById(setting);
            }
        } catch (DuplicateKeyException ignored) {
            settingMapper.updateById(setting);
        }
        return request.getMaxCount();
    }

    private synchronized void ensureInitialized() {
        for (TagType type : TagType.values()) {
            if (optionMapper.selectCount(Wrappers.<TagOption>lambdaQuery()
                    .eq(TagOption::getTagType, type.name())) == 0) {
                List<String> defaults = switch (type) {
                    case OCCASION -> TagDefaults.OCCASIONS;
                    case FESTIVAL -> TagDefaults.FESTIVALS;
                    case MEANING -> TagDefaults.FLOWER_MEANINGS;
                };
                for (int index = 0; index < defaults.size(); index++) {
                    TagOption option = new TagOption();
                    option.setTagType(type.name());
                    option.setName(defaults.get(index));
                    option.setSortOrder(index + 1);
                    try {
                        optionMapper.insert(option);
                    } catch (DuplicateKeyException ignored) {
                        // 并发初始化时忽略已插入的标签。
                    }
                }
            }
            if (settingMapper.selectById(type.name()) == null) {
                TagTypeSetting setting = new TagTypeSetting();
                setting.setTagType(type.name());
                setting.setMaxSelectCount(DEFAULT_MAX_COUNTS.get(type));
                try {
                    settingMapper.insert(setting);
                } catch (DuplicateKeyException ignored) {
                    // 并发初始化时忽略已插入的配置。
                }
            }
        }
    }
}

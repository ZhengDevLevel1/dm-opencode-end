package com.flower.mall.module.tag.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.enums.TagType;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.module.tag.dto.TagCreateRequest;
import com.flower.mall.module.tag.dto.TagHomeDisplayRequest;
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

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
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
            if (type == TagType.CATEGORY) {
                continue;
            }
            maxCounts.put(type.getKey(), maxCount(type));
        }
        return TagOverviewVO.builder()
                .categories(options(TagType.CATEGORY))
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

    public List<String> homeNames(TagType type) {
        ensureInitialized();
        return optionMapper.selectList(Wrappers.<TagOption>lambdaQuery()
                        .eq(TagOption::getTagType, type.name())
                        .orderByAsc(TagOption::getHomeSortOrder)
                        .orderByAsc(TagOption::getSortOrder)
                        .orderByAsc(TagOption::getId))
                .stream()
                .filter(option -> Boolean.TRUE.equals(option.getHomeVisible()))
                .map(TagOption::getName)
                .toList();
    }

    public int maxCount(TagType type) {
        TagTypeSetting setting = settingMapper.selectById(type.name());
        return setting == null || setting.getMaxSelectCount() == null
                ? DEFAULT_MAX_COUNTS.getOrDefault(type, 1)
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
        List<TagOption> existing = optionMapper.selectList(Wrappers.<TagOption>lambdaQuery()
                .eq(TagOption::getTagType, type.name()));
        int maxSort = existing.stream()
                .map(TagOption::getSortOrder)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0);
        int maxHomeSort = existing.stream()
                .map(TagOption::getHomeSortOrder)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0);
        TagOption option = new TagOption();
        option.setTagType(type.name());
        option.setName(name);
        option.setSortOrder(maxSort + 1);
        option.setHomeVisible(true);
        option.setHomeSortOrder(maxHomeSort + 1);
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

    @Transactional
    public void updateHomeDisplay(TagHomeDisplayRequest request) {
        TagType type = TagType.fromValue(request.getType());
        if (type != TagType.CATEGORY && type != TagType.OCCASION) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "该标签类型不支持首页展示配置");
        }
        ensureInitialized();
        Map<Long, TagOption> options = optionMapper.selectList(Wrappers.<TagOption>lambdaQuery()
                        .eq(TagOption::getTagType, type.name()))
                .stream()
                .collect(Collectors.toMap(TagOption::getId, Function.identity()));
        if (request.getItems().size() != options.size()) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "首页展示配置需要包含该类型的全部标签");
        }
        Set<Long> seen = new HashSet<>();
        for (int index = 0; index < request.getItems().size(); index++) {
            TagHomeDisplayRequest.Item item = request.getItems().get(index);
            TagOption option = options.get(item.getId());
            if (option == null) {
                throw BusinessException.of(ErrorCode.BAD_REQUEST, "标签不属于该类型");
            }
            if (!seen.add(item.getId())) {
                throw BusinessException.of(ErrorCode.BAD_REQUEST, "标签不能重复配置");
            }
            option.setHomeVisible(Boolean.TRUE.equals(item.getVisible()));
            option.setHomeSortOrder(index + 1);
            optionMapper.updateById(option);
        }
    }

    private synchronized void ensureInitialized() {
        for (TagType type : TagType.values()) {
            if (optionMapper.selectCount(Wrappers.<TagOption>lambdaQuery()
                    .eq(TagOption::getTagType, type.name())) == 0) {
                List<String> defaults = switch (type) {
                    case CATEGORY -> TagDefaults.CATEGORIES;
                    case OCCASION -> TagDefaults.OCCASIONS;
                    case FESTIVAL -> TagDefaults.FESTIVALS;
                    case MEANING -> TagDefaults.FLOWER_MEANINGS;
                };
                for (int index = 0; index < defaults.size(); index++) {
                    TagOption option = new TagOption();
                    option.setTagType(type.name());
                    option.setName(defaults.get(index));
                    option.setSortOrder(index + 1);
                    option.setHomeVisible(type == TagType.CATEGORY || index < 6);
                    option.setHomeSortOrder(index + 1);
                    try {
                        optionMapper.insert(option);
                    } catch (DuplicateKeyException ignored) {
                        // 并发初始化时忽略已插入的标签。
                    }
                }
            }
            if (type != TagType.CATEGORY && settingMapper.selectById(type.name()) == null) {
                TagTypeSetting setting = new TagTypeSetting();
                setting.setTagType(type.name());
                setting.setMaxSelectCount(DEFAULT_MAX_COUNTS.getOrDefault(type, 1));
                try {
                    settingMapper.insert(setting);
                } catch (DuplicateKeyException ignored) {
                    // 并发初始化时忽略已插入的配置。
                }
            }
        }
    }
}

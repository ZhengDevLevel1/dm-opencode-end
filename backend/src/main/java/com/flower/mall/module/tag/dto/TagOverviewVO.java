package com.flower.mall.module.tag.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class TagOverviewVO {

    private List<TagOptionVO> categories;
    private List<TagOptionVO> occasions;
    private List<TagOptionVO> festivals;
    private List<TagOptionVO> flowerMeanings;
    private Map<String, Integer> maxCounts;
}

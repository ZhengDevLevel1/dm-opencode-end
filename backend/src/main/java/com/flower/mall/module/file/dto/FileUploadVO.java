package com.flower.mall.module.file.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadVO {

    private String url;
    private String objectName;
    private String originalName;
    private String contentType;
    private long size;
}

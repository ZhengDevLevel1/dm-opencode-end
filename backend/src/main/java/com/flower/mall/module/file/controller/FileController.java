package com.flower.mall.module.file.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.file.dto.FileUploadVO;
import com.flower.mall.module.file.service.FileStorageService;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "文件上传")
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @Operation(summary = "上传图片")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @OperationLogRecord(module = "文件", operation = "上传图片", saveParams = false)
    public ApiResponse<FileUploadVO> uploadImage(@RequestParam("file") MultipartFile file,
                                                 @RequestParam(value = "category", defaultValue = "product") String category) {
        return ApiResponse.ok(fileStorageService.uploadImage(file, category));
    }
}

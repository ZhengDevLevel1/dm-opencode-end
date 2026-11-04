package com.flower.mall.module.file.service;

import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.file.dto.FileUploadVO;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_CATEGORIES = Set.of("avatar", "product", "background");
    private static final Map<String, String> CONTENT_TYPE_EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif");

    private final AppProperties properties;
    private final MinioClient minioClient;
    private volatile boolean bucketReady = false;

    public FileStorageService(AppProperties properties) {
        this.properties = properties;
        AppProperties.Minio minio = properties.getMinio();
        this.minioClient = minio.isEnabled()
                ? MinioClient.builder()
                        .endpoint(minio.getEndpoint())
                        .credentials(minio.getAccessKey(), minio.getSecretKey())
                        .build()
                : null;
    }

    public FileUploadVO uploadImage(MultipartFile file, String category) {
        AppProperties.Minio minio = properties.getMinio();
        if (!minio.isEnabled() || minioClient == null) {
            throw BusinessException.of(ErrorCode.FILE_UPLOAD_DISABLED);
        }
        String normalizedCategory = normalizeCategory(category);
        String contentType = validateImage(file);
        ensureBucket(minio);

        String extension = CONTENT_TYPE_EXTENSIONS.get(contentType);
        String objectName = normalizedCategory + "/"
                + LocalDate.now().format(DateTimeFormatter.ISO_DATE) + "/"
                + UUID.randomUUID().toString().replace("-", "") + "." + extension;
        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(minio.getBucket())
                    .object(objectName)
                    .stream(inputStream, file.getSize(), -1)
                    .contentType(contentType)
                    .build());
        } catch (Exception exception) {
            log.error("MinIO 图片上传失败: bucket={}, object={}", minio.getBucket(), objectName, exception);
            throw BusinessException.of(ErrorCode.FILE_UPLOAD_FAILED);
        }

        return FileUploadVO.builder()
                .url(publicUrl(minio, objectName))
                .objectName(objectName)
                .originalName(file.getOriginalFilename())
                .contentType(contentType)
                .size(file.getSize())
                .build();
    }

    private String normalizeCategory(String category) {
        if (!StringUtils.hasText(category)) {
            throw BusinessException.of(ErrorCode.FILE_CATEGORY_INVALID);
        }
        String normalized = category.trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_CATEGORIES.contains(normalized)) {
            throw BusinessException.of(ErrorCode.FILE_CATEGORY_INVALID);
        }
        return normalized;
    }

    private String validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw BusinessException.of(ErrorCode.FILE_TYPE_INVALID);
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw BusinessException.of(ErrorCode.FILE_TOO_LARGE);
        }
        String contentType = file.getContentType();
        if (!StringUtils.hasText(contentType)) {
            throw BusinessException.of(ErrorCode.FILE_TYPE_INVALID);
        }
        String normalized = contentType.toLowerCase(Locale.ROOT);
        if (!CONTENT_TYPE_EXTENSIONS.containsKey(normalized)) {
            throw BusinessException.of(ErrorCode.FILE_TYPE_INVALID);
        }
        return normalized;
    }

    private void ensureBucket(AppProperties.Minio minio) {
        if (bucketReady) {
            return;
        }
        synchronized (this) {
            if (bucketReady) {
                return;
            }
            try {
                boolean exists = minioClient.bucketExists(BucketExistsArgs.builder()
                        .bucket(minio.getBucket())
                        .build());
                if (!exists) {
                    if (!minio.isAutoCreateBucket()) {
                        throw BusinessException.of(ErrorCode.FILE_UPLOAD_FAILED,
                                "MinIO 存储桶不存在，请先创建或开启自动创建");
                    }
                    minioClient.makeBucket(MakeBucketArgs.builder()
                            .bucket(minio.getBucket())
                            .build());
                }
                if (minio.isPublicRead()) {
                    applyPublicReadPolicy(minio);
                }
                bucketReady = true;
            } catch (BusinessException exception) {
                throw exception;
            } catch (Exception exception) {
                log.error("MinIO 存储桶初始化失败: bucket={}", minio.getBucket(), exception);
                throw BusinessException.of(ErrorCode.FILE_UPLOAD_FAILED);
            }
        }
    }

    private void applyPublicReadPolicy(AppProperties.Minio minio) {
        String policy = """
                {
                  "Version": "2012-10-17",
                  "Statement": [
                    {
                      "Effect": "Allow",
                      "Principal": {"AWS": ["*"]},
                      "Action": ["s3:GetObject"],
                      "Resource": ["arn:aws:s3:::%s/*"]
                    }
                  ]
                }
                """.formatted(minio.getBucket());
        try {
            minioClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                    .bucket(minio.getBucket())
                    .config(policy)
                    .build());
        } catch (Exception exception) {
            log.warn("MinIO 存储桶公开读策略设置失败，请手动配置公开访问: bucket={}", minio.getBucket(), exception);
        }
    }

    private String publicUrl(AppProperties.Minio minio, String objectName) {
        String base = StringUtils.hasText(minio.getPublicUrl())
                ? minio.getPublicUrl()
                : minio.getEndpoint() + "/" + minio.getBucket();
        return base.replaceAll("/+$", "") + "/" + objectName;
    }
}

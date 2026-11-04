package com.flower.mall.module.review.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.common.enums.OrderStatus;
import com.flower.mall.common.enums.ReviewStatus;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.order.entity.Order;
import com.flower.mall.module.order.entity.OrderItem;
import com.flower.mall.module.order.mapper.OrderItemMapper;
import com.flower.mall.module.order.mapper.OrderMapper;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.module.product.mapper.ProductMapper;
import com.flower.mall.module.review.dto.ReviewCreateRequest;
import com.flower.mall.module.review.dto.ReviewVO;
import com.flower.mall.module.review.entity.Review;
import com.flower.mall.module.review.mapper.ReviewMapper;
import com.flower.mall.module.user.entity.User;
import com.flower.mall.module.user.mapper.UserMapper;
import com.flower.mall.support.CacheKeys;
import com.flower.mall.support.CacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewMapper reviewMapper;
    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;
    private final UserMapper userMapper;
    private final CacheService cacheService;

    @Transactional
    public ReviewVO create(ReviewCreateRequest request) {
        Long userId = SecurityUtils.currentUserId();
        OrderItem orderItem = orderItemMapper.selectById(request.getOrderItemId());
        if (orderItem == null) {
            throw BusinessException.of(ErrorCode.ORDER_ITEM_NOT_FOUND);
        }
        Order order = orderMapper.selectById(orderItem.getOrderId());
        if (order == null || !userId.equals(order.getUserId())) {
            throw BusinessException.of(ErrorCode.ORDER_ACCESS_DENIED);
        }
        if (!OrderStatus.COMPLETED.name().equals(order.getStatus())) {
            throw BusinessException.of(ErrorCode.REVIEW_NOT_ALLOWED, "仅已完成订单可以评价");
        }
        Long exists = reviewMapper.selectCount(Wrappers.<Review>lambdaQuery()
                .eq(Review::getOrderItemId, orderItem.getId()));
        if (exists > 0 || (orderItem.getReviewed() != null && orderItem.getReviewed() == 1)) {
            throw BusinessException.of(ErrorCode.REVIEW_DUPLICATE);
        }
        Review review = new Review();
        review.setOrderId(order.getId());
        review.setOrderItemId(orderItem.getId());
        review.setUserId(userId);
        review.setProductId(orderItem.getProductId());
        review.setRating(request.getRating());
        review.setContent(request.getContent());
        review.setStatus(ReviewStatus.VISIBLE.name());
        reviewMapper.insert(review);

        OrderItem updateItem = new OrderItem();
        updateItem.setId(orderItem.getId());
        updateItem.setReviewed(1);
        orderItemMapper.updateById(updateItem);
        recalculateProductRating(orderItem.getProductId());
        return toVOList(List.of(reviewMapper.selectById(review.getId())), false).get(0);
    }

    public PageResult<ReviewVO> pageByProduct(Long productId, long page, long size) {
        IPage<Review> reviewPage = reviewMapper.selectPage(new Page<>(Math.max(page, 1), clampSize(size)),
                Wrappers.<Review>lambdaQuery()
                        .eq(Review::getProductId, productId)
                        .eq(Review::getStatus, ReviewStatus.VISIBLE.name())
                        .orderByDesc(Review::getId));
        return PageResult.of(toVOList(reviewPage.getRecords(), false),
                reviewPage.getTotal(), reviewPage.getCurrent(), reviewPage.getSize());
    }

    public PageResult<ReviewVO> pageMine(long page, long size) {
        Long userId = SecurityUtils.currentUserId();
        IPage<Review> reviewPage = reviewMapper.selectPage(new Page<>(Math.max(page, 1), clampSize(size)),
                Wrappers.<Review>lambdaQuery()
                        .eq(Review::getUserId, userId)
                        .orderByDesc(Review::getId));
        return PageResult.of(toVOList(reviewPage.getRecords(), true),
                reviewPage.getTotal(), reviewPage.getCurrent(), reviewPage.getSize());
    }

    public PageResult<ReviewVO> pageAdmin(long page, long size, Long productId, String status) {
        IPage<Review> reviewPage = reviewMapper.selectPage(new Page<>(Math.max(page, 1), clampSize(size)),
                Wrappers.<Review>lambdaQuery()
                        .eq(productId != null, Review::getProductId, productId)
                        .eq(StringUtils.hasText(status), Review::getStatus, status)
                        .orderByDesc(Review::getId));
        return PageResult.of(toVOList(reviewPage.getRecords(), true),
                reviewPage.getTotal(), reviewPage.getCurrent(), reviewPage.getSize());
    }

    @Transactional
    public ReviewVO updateStatus(Long reviewId, String status) {
        ReviewStatus target;
        try {
            target = ReviewStatus.valueOf(status);
        } catch (IllegalArgumentException exception) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "评价状态不合法");
        }
        Review review = getRequired(reviewId);
        Review update = new Review();
        update.setId(reviewId);
        update.setStatus(target.name());
        reviewMapper.updateById(update);
        recalculateProductRating(review.getProductId());
        return toVOList(List.of(reviewMapper.selectById(reviewId)), true).get(0);
    }

    @Transactional
    public ReviewVO reply(Long reviewId, String reply) {
        Review review = getRequired(reviewId);
        Review update = new Review();
        update.setId(reviewId);
        update.setReply(reply);
        reviewMapper.updateById(update);
        return toVOList(List.of(reviewMapper.selectById(reviewId)), true).get(0);
    }

    private Review getRequired(Long reviewId) {
        Review review = reviewMapper.selectById(reviewId);
        if (review == null) {
            throw BusinessException.of(ErrorCode.REVIEW_NOT_FOUND);
        }
        return review;
    }

    private void recalculateProductRating(Long productId) {
        ReviewMapper.RatingStats stats = reviewMapper.selectRatingStats(productId);
        BigDecimal avg = stats.avgRating() == null
                ? BigDecimal.ZERO
                : stats.avgRating().setScale(2, RoundingMode.HALF_UP);
        productMapper.updateRatingStats(productId, avg, stats.reviewCount());
        cacheService.evict(CacheKeys.productDetail(productId));
        cacheService.evict(CacheKeys.HOT_PRODUCTS);
    }

    private List<ReviewVO> toVOList(List<Review> reviews, boolean includeProductName) {
        if (reviews.isEmpty()) {
            return List.of();
        }
        Map<Long, User> users = userMapper.selectBatchIds(
                        reviews.stream().map(Review::getUserId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<Long, Product> products = includeProductName
                ? productMapper.selectBatchIds(reviews.stream().map(Review::getProductId).distinct().toList())
                .stream().collect(Collectors.toMap(Product::getId, Function.identity()))
                : Map.of();
        return reviews.stream().map(review -> {
            ReviewVO vo = ReviewVO.from(review);
            User user = users.get(review.getUserId());
            if (user != null) {
                vo.setNickname(StringUtils.hasText(user.getNickname()) ? user.getNickname() : "会员用户");
            }
            if (includeProductName) {
                Product product = products.get(review.getProductId());
                vo.setProductName(product == null ? "商品已删除" : product.getName());
            }
            return vo;
        }).toList();
    }

    private long clampSize(long size) {
        return Math.min(Math.max(size, 1), 100);
    }
}

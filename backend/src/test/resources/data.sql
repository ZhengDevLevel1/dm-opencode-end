INSERT INTO sys_user (id, username, password, nickname, phone, email, role, status, created_at) VALUES
(1, 'admin', '$2a$10$35/6kxXtuaL1EReRCGBtkOJLxqGRTaneTZfa2a9J/7LDnOOMfYsb2', '系统管理员', '13800000001', 'admin@flower.local', 'ADMIN', 'ENABLED', DATEADD('DAY', -180, CURRENT_TIMESTAMP)),
(2, 'staff', '$2a$10$uTa4iQ7rC4shnrvDBGtjTeg40A3TRTfAWzSq8sSVTEryfxRCXF9ka', '花艺店员', '13800000002', 'staff@flower.local', 'STAFF', 'ENABLED', DATEADD('DAY', -150, CURRENT_TIMESTAMP)),
(3, 'customer', '$2a$10$UOWDZ803o1iJSyi9sC2D3.ZlTtg2qIYK0E8lZ9TaRLYe0OiV5w2CO', '小玫', '13900000003', 'customer@flower.local', 'CUSTOMER', 'ENABLED', DATEADD('DAY', -120, CURRENT_TIMESTAMP)),
(4, 'alice', '$2a$10$0tqIg0C4j23jTHWxyU5JQObjXiseEH6hQf8kq9eAYs9C04f/AfH0O', '爱丽丝', '13900000004', 'alice@flower.local', 'CUSTOMER', 'ENABLED', DATEADD('DAY', -90, CURRENT_TIMESTAMP)),
(5, 'bob', '$2a$10$UOWDZ803o1iJSyi9sC2D3.ZlTtg2qIYK0E8lZ9TaRLYe0OiV5w2CO', '新用户鲍勃', '13900000005', 'bob@flower.local', 'CUSTOMER', 'ENABLED', DATEADD('DAY', -1, CURRENT_TIMESTAMP)),
(6, 'disabled', '$2a$10$UOWDZ803o1iJSyi9sC2D3.ZlTtg2qIYK0E8lZ9TaRLYe0OiV5w2CO', '已停用用户', '13900000006', 'disabled@flower.local', 'CUSTOMER', 'DISABLED', DATEADD('DAY', -30, CURRENT_TIMESTAMP));

INSERT INTO product (id, name, category, flower_meaning, occasion_tags, festival_tags, price, original_price, stock, image_url, description, season_suitability, sales_count, rating_avg, rating_count, status, created_at) VALUES
(1, '经典红玫瑰礼盒·11朵', '玫瑰', '热烈爱情，至死不渝', '表白,纪念日,生日', '情人节,七夕', 199.00, 239.00, 120, '/images/products/rose-11.svg', '精选厄瓜多尔红玫瑰11朵，搭配尤加利叶与雾面礼盒，适合表白与纪念日。', 'ALL', 320, 4.80, 86, 'ON_SALE', DATEADD('DAY', -160, CURRENT_TIMESTAMP)),
(2, '香槟玫瑰·99朵', '玫瑰', '天长地久，只此一人', '求婚,纪念日,表白', '情人节,七夕', 599.00, 699.00, 43, '/images/products/rose-99.svg', '99朵香槟玫瑰巨型花束，手工包扎，适合求婚与重要纪念日。', 'ALL', 96, 4.90, 30, 'ON_SALE', DATEADD('DAY', -155, CURRENT_TIMESTAMP)),
(3, '粉色康乃馨花束', '康乃馨', '感恩母爱，温柔守护', '母亲节,教师节,生日', '母亲节,教师节', 129.00, 159.00, 80, '/images/products/carnation-pink.svg', '粉色康乃馨搭配洋桔梗，温柔配色，送给母亲与老师的心意之选。', 'SPRING', 210, 4.70, 55, 'ON_SALE', DATEADD('DAY', -150, CURRENT_TIMESTAMP)),
(4, '白百合花束', '百合', '纯洁高雅，百年好合', '婚礼,开业,生日', '春节', 159.00, 199.00, 60, '/images/products/lily-white.svg', '香水百合6枝，搭配白色满天星，清雅大气，适合婚礼与开业。', 'ALL', 180, 4.60, 40, 'ON_SALE', DATEADD('DAY', -145, CURRENT_TIMESTAMP)),
(5, '向日葵花束', '向日葵', '阳光忠诚，勇敢追梦', '毕业季,生日,探望', '毕业季', 109.00, 139.00, 90, '/images/products/sunflower.svg', '向日葵5枝搭配尤加利叶，明亮温暖，为毕业与生日送上祝福。', 'SUMMER', 150, 4.50, 33, 'ON_SALE', DATEADD('DAY', -140, CURRENT_TIMESTAMP)),
(6, '郁金香花束', '郁金香', '爱的告白，优雅浪漫', '情人节,生日,日常', '情人节', 139.00, 169.00, 70, '/images/products/tulip.svg', '进口郁金香10枝，色彩柔和，日常送花与告白皆宜。', 'SPRING', 130, 4.60, 25, 'ON_SALE', DATEADD('DAY', -130, CURRENT_TIMESTAMP)),
(7, '混搭鲜花礼盒', '混合花束', '温暖祝福，日日欢喜', '生日,日常,探望', '', 189.00, 229.00, 100, '/images/products/mixed-box.svg', '玫瑰、洋桔梗、小雏菊混搭礼盒，明亮配色，适合日常送礼。', 'ALL', 260, 4.70, 62, 'ON_SALE', DATEADD('DAY', -120, CURRENT_TIMESTAMP)),
(8, '永生玫瑰礼盒', '永生花', '永恒的爱，永不凋零', '情人节,纪念日,求婚', '情人节,七夕', 329.00, 399.00, 30, '/images/products/preserved-rose.svg', '厄瓜多尔永生玫瑰搭配玻璃罩与灯串，长久保存的浪漫纪念。', 'ALL', 88, 4.80, 21, 'ON_SALE', DATEADD('DAY', -110, CURRENT_TIMESTAMP)),
(9, '绿色小盆栽', '绿植', '生机陪伴，清新每一天', '日常,办公', '', 49.00, 69.00, 150, '/images/products/green-plant.svg', '易打理绿植盆栽，附赠养护卡片，适合办公桌与家居点缀。', 'ALL', 400, 4.40, 70, 'ON_SALE', DATEADD('DAY', -100, CURRENT_TIMESTAMP)),
(10, '满天星花束', '满天星', '思念守望，温柔星河', '生日,日常,毕业季', '毕业季', 79.00, 99.00, 120, '/images/products/babys-breath.svg', '大束满天星，轻盈如星，适合日常惊喜与毕业赠礼。', 'ALL', 190, 4.30, 28, 'ON_SALE', DATEADD('DAY', -95, CURRENT_TIMESTAMP)),
(11, '康乃馨百合组合', '混合花束', '感恩祝福，平安顺遂', '母亲节,教师节,探望', '母亲节,教师节', 169.00, 199.00, 65, '/images/products/carnation-lily.svg', '康乃馨与百合组合花束，表达感恩与祝福，长辈送礼首选。', 'SPRING', 143, 4.70, 37, 'ON_SALE', DATEADD('DAY', -90, CURRENT_TIMESTAMP)),
(12, '圣诞花环', '礼盒', '节日祝福，温暖团圆', '圣诞派对,新年', '圣诞节,春节', 119.00, 149.00, 50, '/images/products/christmas-wreath.svg', '松枝与红果手工花环，节日氛围浓厚，可悬挂于门庭。', 'WINTER', 100, 4.50, 18, 'ON_SALE', DATEADD('DAY', -85, CURRENT_TIMESTAMP)),
(13, '七夕星空玫瑰', '玫瑰', '浪漫星河，只为你来', '七夕,情人节,表白', '七夕,情人节', 269.00, 319.00, 45, '/images/products/starry-rose.svg', '蓝白玫瑰与满天星打造星空主题花束，七夕限定设计。', 'SUMMER', 120, 4.90, 26, 'ON_SALE', DATEADD('DAY', -80, CURRENT_TIMESTAMP)),
(14, '婚礼手捧花', '混合花束', '百年好合，幸福启程', '婚礼,纪念日', '', 399.00, 459.00, 20, '/images/products/wedding-bouquet.svg', '新娘手捧花，白玫瑰与洋桔梗手工定制，可预约色系搭配。', 'ALL', 66, 4.80, 15, 'ON_SALE', DATEADD('DAY', -75, CURRENT_TIMESTAMP)),
(15, '下架测试百合', '百合', '测试商品', '日常', '', 99.00, 129.00, 10, '/images/products/lily-test.svg', '用于验证下架商品不可下单。', 'ALL', 0, 0.00, 0, 'OFF_SHELF', DATEADD('DAY', -60, CURRENT_TIMESTAMP)),
(16, '康乃馨单支', '康乃馨', '感恩每一天', '母亲节,教师节,日常', '母亲节,教师节', 19.00, 29.00, 6, '/images/products/carnation-single.svg', '单支康乃馨，简单心意，适合日常表达感谢。', 'SPRING', 500, 4.20, 12, 'ON_SALE', DATEADD('DAY', -50, CURRENT_TIMESTAMP));

INSERT INTO shop_order (id, order_no, user_id, total_amount, pay_amount, status, receiver_name, receiver_phone, receiver_address, remark, cancel_reason, paid_at, completed_at, version, created_at) VALUES
(1, 'FL202605010001', 3, 358.00, 358.00, 'COMPLETED', '小玫', '13900000003', '上海市徐汇区衡山路88号1号楼502', '请在工作日下午配送', NULL, DATEADD('DAY', -5, CURRENT_TIMESTAMP), DATEADD('DAY', -3, CURRENT_TIMESTAMP), 0, DATEADD('DAY', -5, CURRENT_TIMESTAMP)),
(2, 'FL202605020002', 4, 298.00, 298.00, 'COMPLETED', '爱丽丝', '13900000004', '上海市静安区南京西路1266号', '母亲节礼物，请附贺卡', NULL, DATEADD('DAY', -10, CURRENT_TIMESTAMP), DATEADD('DAY', -8, CURRENT_TIMESTAMP), 0, DATEADD('DAY', -10, CURRENT_TIMESTAMP)),
(3, 'FL202605030003', 4, 238.00, 238.00, 'PENDING_PAYMENT', '爱丽丝', '13900000004', '上海市静安区南京西路1266号', NULL, NULL, NULL, NULL, 0, DATEADD('DAY', -1, CURRENT_TIMESTAMP)),
(4, 'FL202605040004', 3, 599.00, 599.00, 'CANCELLED', '小玫', '13900000003', '上海市徐汇区衡山路88号1号楼502', NULL, '临时取消，改日再订', NULL, NULL, 0, DATEADD('DAY', -15, CURRENT_TIMESTAMP)),
(5, 'FL202605050005', 4, 189.00, 189.00, 'PAID', '爱丽丝', '13900000004', '上海市静安区南京西路1266号', '希望18点前送达', NULL, DATEADD('HOUR', -2, CURRENT_TIMESTAMP), NULL, 0, DATEADD('HOUR', -2, CURRENT_TIMESTAMP));

INSERT INTO order_item (id, order_id, product_id, product_name, product_image, category, unit_price, quantity, subtotal, reviewed) VALUES
(1, 1, 1, '经典红玫瑰礼盒·11朵', '/images/products/rose-11.svg', '玫瑰', 199.00, 1, 199.00, 1),
(2, 1, 4, '白百合花束', '/images/products/lily-white.svg', '百合', 159.00, 1, 159.00, 0),
(3, 2, 3, '粉色康乃馨花束', '/images/products/carnation-pink.svg', '康乃馨', 129.00, 1, 129.00, 1),
(4, 2, 11, '康乃馨百合组合', '/images/products/carnation-lily.svg', '混合花束', 169.00, 1, 169.00, 0),
(5, 3, 12, '圣诞花环', '/images/products/christmas-wreath.svg', '礼盒', 119.00, 2, 238.00, 0),
(6, 4, 2, '香槟玫瑰·99朵', '/images/products/rose-99.svg', '玫瑰', 599.00, 1, 599.00, 0),
(7, 5, 7, '混搭鲜花礼盒', '/images/products/mixed-box.svg', '混合花束', 189.00, 1, 189.00, 0);

INSERT INTO payment_record (id, payment_no, order_id, order_no, user_id, amount, channel, status, paid_at, callback_at, created_at) VALUES
(1, 'PAY202605010001', 1, 'FL202605010001', 3, 358.00, 'MOCK', 'SUCCESS', DATEADD('DAY', -5, CURRENT_TIMESTAMP), DATEADD('DAY', -5, CURRENT_TIMESTAMP), DATEADD('DAY', -5, CURRENT_TIMESTAMP)),
(2, 'PAY202605020002', 2, 'FL202605020002', 4, 298.00, 'MOCK', 'SUCCESS', DATEADD('DAY', -10, CURRENT_TIMESTAMP), DATEADD('DAY', -10, CURRENT_TIMESTAMP), DATEADD('DAY', -10, CURRENT_TIMESTAMP)),
(3, 'PAY202605030003', 3, 'FL202605030003', 4, 238.00, 'MOCK', 'PENDING', NULL, NULL, DATEADD('DAY', -1, CURRENT_TIMESTAMP)),
(4, 'PAY202605040004', 4, 'FL202605040004', 3, 599.00, 'MOCK', 'FAILED', NULL, NULL, DATEADD('DAY', -15, CURRENT_TIMESTAMP)),
(5, 'PAY202605050005', 5, 'FL202605050005', 4, 189.00, 'MOCK', 'SUCCESS', DATEADD('HOUR', -2, CURRENT_TIMESTAMP), DATEADD('HOUR', -2, CURRENT_TIMESTAMP), DATEADD('HOUR', -2, CURRENT_TIMESTAMP));

INSERT INTO fulfillment_record (id, order_id, order_no, node, operator_id, operator_name, remark, created_at) VALUES
(1, 1, 'FL202605010001', 'ACCEPTED', 2, '花艺店员', '门店已接单', DATEADD('DAY', -5, CURRENT_TIMESTAMP)),
(2, 1, 'FL202605010001', 'PREPARING', 2, '花艺店员', '花材已备齐，开始制作', DATEADD('DAY', -4, CURRENT_TIMESTAMP)),
(3, 1, 'FL202605010001', 'DELIVERING', 2, '花艺店员', '骑手已取货', DATEADD('DAY', -4, CURRENT_TIMESTAMP)),
(4, 1, 'FL202605010001', 'SIGNED', 2, '花艺店员', '客户已签收', DATEADD('DAY', -3, CURRENT_TIMESTAMP)),
(5, 2, 'FL202605020002', 'ACCEPTED', 2, '花艺店员', '预约单已接单', DATEADD('DAY', -10, CURRENT_TIMESTAMP)),
(6, 2, 'FL202605020002', 'PREPARING', 2, '花艺店员', '贺卡已写好', DATEADD('DAY', -9, CURRENT_TIMESTAMP)),
(7, 2, 'FL202605020002', 'DELIVERING', 2, '花艺店员', '已出发配送', DATEADD('DAY', -9, CURRENT_TIMESTAMP)),
(8, 2, 'FL202605020002', 'SIGNED', 2, '花艺店员', '本人签收', DATEADD('DAY', -8, CURRENT_TIMESTAMP));

INSERT INTO review (id, order_id, order_item_id, user_id, product_id, rating, content, reply, status, created_at) VALUES
(1, 1, 1, 3, 1, 5, '花很新鲜，包装精致，配送也很准时。', '感谢您的认可，期待再次为您送花。', 'VISIBLE', DATEADD('DAY', -3, CURRENT_TIMESTAMP)),
(2, 2, 3, 4, 3, 5, '妈妈很喜欢，颜色比图片还温柔。', NULL, 'VISIBLE', DATEADD('DAY', -8, CURRENT_TIMESTAMP));

INSERT INTO inventory_record (id, product_id, product_name, change_type, change_quantity, stock_before, stock_after, order_no, operator_id, operator_name, remark, created_at) VALUES
(1, 1, '经典红玫瑰礼盒·11朵', 'ORDER_DEDUCT', -1, 121, 120, 'FL202605010001', 3, '小玫', '下单扣减库存', DATEADD('DAY', -5, CURRENT_TIMESTAMP)),
(2, 4, '白百合花束', 'ORDER_DEDUCT', -1, 61, 60, 'FL202605010001', 3, '小玫', '下单扣减库存', DATEADD('DAY', -5, CURRENT_TIMESTAMP)),
(3, 3, '粉色康乃馨花束', 'ORDER_DEDUCT', -1, 81, 80, 'FL202605020002', 4, '爱丽丝', '下单扣减库存', DATEADD('DAY', -10, CURRENT_TIMESTAMP)),
(4, 11, '康乃馨百合组合', 'ORDER_DEDUCT', -1, 66, 65, 'FL202605020002', 4, '爱丽丝', '下单扣减库存', DATEADD('DAY', -10, CURRENT_TIMESTAMP)),
(5, 12, '圣诞花环', 'ORDER_DEDUCT', -2, 52, 50, 'FL202605030003', 4, '爱丽丝', '下单扣减库存', DATEADD('DAY', -1, CURRENT_TIMESTAMP)),
(6, 2, '香槟玫瑰·99朵', 'ORDER_DEDUCT', -1, 43, 42, 'FL202605040004', 3, '小玫', '下单扣减库存', DATEADD('DAY', -15, CURRENT_TIMESTAMP)),
(7, 2, '香槟玫瑰·99朵', 'ORDER_CANCEL', 1, 42, 43, 'FL202605040004', 3, '小玫', '取消订单回补库存', DATEADD('DAY', -14, CURRENT_TIMESTAMP)),
(8, 7, '混搭鲜花礼盒', 'ORDER_DEDUCT', -1, 101, 100, 'FL202605050005', 4, '爱丽丝', '下单扣减库存', DATEADD('HOUR', -2, CURRENT_TIMESTAMP));

INSERT INTO user_favorite (id, user_id, product_id, created_at) VALUES
(1, 3, 1, DATEADD('DAY', -20, CURRENT_TIMESTAMP)),
(2, 3, 6, DATEADD('DAY', -18, CURRENT_TIMESTAMP)),
(3, 3, 8, DATEADD('DAY', -12, CURRENT_TIMESTAMP)),
(4, 4, 3, DATEADD('DAY', -25, CURRENT_TIMESTAMP)),
(5, 4, 11, DATEADD('DAY', -22, CURRENT_TIMESTAMP)),
(6, 4, 8, DATEADD('DAY', -6, CURRENT_TIMESTAMP));

INSERT INTO recommendation_weight (id, content_weight, popularity_weight, festival_weight, rating_weight, updated_by, updated_at) VALUES
(1, 0.400, 0.200, 0.250, 0.150, 1, DATEADD('DAY', -30, CURRENT_TIMESTAMP));

INSERT INTO recommendation_log (id, user_id, scene, festival, season, cold_start, weights_json, product_ids, detail_json, created_at) VALUES
(1, 3, '生日', '情人节', 'SUMMER', 0, '{"content":0.4,"popularity":0.2,"festival":0.25,"rating":0.15}', '1,6,8,13', '[{"productId":1,"score":0.93},{"productId":8,"score":0.89}]', DATEADD('DAY', -2, CURRENT_TIMESTAMP)),
(2, 5, '日常', '无', 'SPRING', 1, '{"content":0.4,"popularity":0.2,"festival":0.25,"rating":0.15}', '7,9,10,3', '[{"productId":7,"score":0.81},{"productId":9,"score":0.78}]', DATEADD('DAY', -1, CURRENT_TIMESTAMP));

INSERT INTO operation_log (id, user_id, username, module, operation, method, request_uri, request_method, request_params, success, error_message, ip, duration_ms, created_at) VALUES
(1, 1, 'admin', '认证', '用户登录', 'AuthController.login', '/api/auth/login', 'POST', '{"username":"admin"}', 1, NULL, '127.0.0.1', 42, DATEADD('DAY', -1, CURRENT_TIMESTAMP)),
(2, 2, 'staff', '履约管理', '订单接单', 'StaffOrderController.accept', '/api/staff/orders/1/accept', 'POST', NULL, 1, NULL, '127.0.0.1', 31, DATEADD('DAY', -5, CURRENT_TIMESTAMP));

ALTER TABLE sys_user ALTER COLUMN id RESTART WITH 100;
ALTER TABLE product ALTER COLUMN id RESTART WITH 100;
ALTER TABLE inventory_record ALTER COLUMN id RESTART WITH 100;
ALTER TABLE cart_item ALTER COLUMN id RESTART WITH 100;
ALTER TABLE user_favorite ALTER COLUMN id RESTART WITH 100;
ALTER TABLE shop_order ALTER COLUMN id RESTART WITH 100;
ALTER TABLE order_item ALTER COLUMN id RESTART WITH 100;
ALTER TABLE payment_record ALTER COLUMN id RESTART WITH 100;
ALTER TABLE fulfillment_record ALTER COLUMN id RESTART WITH 100;
ALTER TABLE review ALTER COLUMN id RESTART WITH 100;
ALTER TABLE recommendation_weight ALTER COLUMN id RESTART WITH 100;
ALTER TABLE recommendation_log ALTER COLUMN id RESTART WITH 100;
ALTER TABLE operation_log ALTER COLUMN id RESTART WITH 100;

USE flower_shop;

ALTER TABLE sys_user
    ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL COMMENT '头像地址' AFTER email;

package com.flower.ai.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class QuestionAdmissionTest {

    @Test
    void parsesFlowerTagAndStripsLeadingPreamble() {
        QuestionAdmission.Parsed parsed = QuestionAdmission.parseLeading(
                "好的，[[FLOWER]]\n送女朋友选什么花？");

        assertThat(parsed.category()).isEqualTo(QuestionAdmission.Category.FLOWER);
        assertThat(parsed.content()).isEqualTo("送女朋友选什么花？");
    }

    @Test
    void parsesSmallOffTopicReply() {
        QuestionAdmission.Parsed parsed = QuestionAdmission.parseLeading(
                "[[OFF_TOPIC_SMALL]] 1+1=2。");

        assertThat(parsed.category()).isEqualTo(QuestionAdmission.Category.OFF_TOPIC_SMALL);
        assertThat(parsed.content()).isEqualTo("1+1=2。");
    }

    @Test
    void parsesLargeOffTopicRefusal() {
        QuestionAdmission.Parsed parsed = QuestionAdmission.parseLeading(
                "[[OFF_TOPIC_LARGE]]\n这个问题超出了我的服务范围，我们可以聊聊送花或养护。");

        assertThat(parsed.category()).isEqualTo(QuestionAdmission.Category.OFF_TOPIC_LARGE);
        assertThat(parsed.content()).isEqualTo("这个问题超出了我的服务范围，我们可以聊聊送花或养护。");
    }

    @Test
    void waitsForIncompleteTag() {
        assertThat(QuestionAdmission.parseLeading("[[OFF")).isNull();
        assertThat(QuestionAdmission.parseLeading("[[OFF_TOPIC_LARGE")).isNull();
    }

    @Test
    void defaultsToFlowerWhenNoTagIsPresent() {
        QuestionAdmission.Parsed parsed = QuestionAdmission.parseLeading("你好，我想买一束玫瑰。");

        assertThat(parsed.category()).isEqualTo(QuestionAdmission.Category.FLOWER);
        assertThat(parsed.content()).isEqualTo("你好，我想买一束玫瑰。");
    }

    @Test
    void normalizesTagCaseAndSpaces() {
        assertThat(QuestionAdmission.parseLeading("[[flower]]\n推荐玫瑰").category())
                .isEqualTo(QuestionAdmission.Category.FLOWER);
        assertThat(QuestionAdmission.parseLeading("[[OFF TOPIC LARGE]]\n换个话题吧").category())
                .isEqualTo(QuestionAdmission.Category.OFF_TOPIC_LARGE);
    }

    @Test
    void stripsUnknownTagButKeepsAnswer() {
        QuestionAdmission.Parsed parsed = QuestionAdmission.parseLeading("[[UNKNOWN]]\n推荐玫瑰");

        assertThat(parsed.category()).isEqualTo(QuestionAdmission.Category.FLOWER);
        assertThat(parsed.content()).isEqualTo("推荐玫瑰");
    }

    @Test
    void fallbackDetectsLargeOffTopicQuestions() {
        assertThat(QuestionAdmission.fallbackCategory("帮我写一个快速排序算法，并解释时间复杂度"))
                .isEqualTo(QuestionAdmission.Category.OFF_TOPIC_LARGE);
        assertThat(QuestionAdmission.fallbackCategory("请帮我写一段 Python 代码"))
                .isEqualTo(QuestionAdmission.Category.OFF_TOPIC_LARGE);
        assertThat(QuestionAdmission.fallbackCategory("把这段花语翻译成英文"))
                .isEqualTo(QuestionAdmission.Category.OFF_TOPIC_LARGE);
    }

    @Test
    void fallbackDetectsSimpleArithmetic() {
        assertThat(QuestionAdmission.fallbackCategory("1+1 等于几？"))
                .isEqualTo(QuestionAdmission.Category.OFF_TOPIC_SMALL);
        assertThat(QuestionAdmission.fallbackCategory("12 * 8 = ?"))
                .isEqualTo(QuestionAdmission.Category.OFF_TOPIC_SMALL);
    }

    @Test
    void fallbackKeepsFlowerQuestions() {
        assertThat(QuestionAdmission.fallbackCategory("送女朋友生日，预算200元，推荐什么花？"))
                .isEqualTo(QuestionAdmission.Category.FLOWER);
        assertThat(QuestionAdmission.fallbackCategory("送论文导师什么花合适"))
                .isEqualTo(QuestionAdmission.Category.FLOWER);
        assertThat(QuestionAdmission.fallbackCategory("送程序员男友什么花"))
                .isEqualTo(QuestionAdmission.Category.FLOWER);
        assertThat(QuestionAdmission.fallbackCategory("帮我写一段花束文案"))
                .isEqualTo(QuestionAdmission.Category.FLOWER);
        assertThat(QuestionAdmission.fallbackCategory("推荐放在电脑桌旁的绿植"))
                .isEqualTo(QuestionAdmission.Category.FLOWER);
    }
}

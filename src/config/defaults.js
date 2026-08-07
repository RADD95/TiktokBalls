module.exports = {
    port: Number(
        process.env.PORT || 3000
    ),

    overlayToken:
        process.env.OVERLAY_TOKEN ||
        'change-me',

    settings: {
        tiktokUsername:
            process.env.TIKTOK_USERNAME ||
            '',

        width: 800,
        height: 600,

        commentPoints: 1,
        commentMultiplier: 1,

        likePoints: 1,
        likeMultiplier: 1,

        followPoints: 1,
        followMultiplier: 1,

        sharePoints: 1,
        shareMultiplier: 2,

        giftPoints: 1,
        giftMultiplier: 1,

        maxPointsPerMinute: 300,

        baseRadius: 24,
        pointsPerRadius: 4,
        maxRadius: 180,

        speed: 1,

        showNames: true,
        showPoints: true,
        showLeaderboard: true,
        showPodium: true,
        showChat: true,

        transparentBackground: true,

        chatFontFamily: 'Arial',
        chatFontSize: 16,
        chatFontWeight: '400',
        chatTextColor: '#ffffff',
        chatTextShadow: true,

        nameFontFamily: 'Arial',
        nameFontSize: 14,
        nameFontWeight: '700',
        nameTextColor: '#ffffff',
        nameTextShadow: true
    }
};
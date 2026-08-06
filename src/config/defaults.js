module.exports = {
    port: Number(process.env.PORT || 3000),

    overlayToken:
        process.env.OVERLAY_TOKEN || 'change-me',

    settings: {
        tiktokUsername:
            process.env.TIKTOK_USERNAME || '',

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
        showLeaderboard: true,
        showPodium: true
    }
};
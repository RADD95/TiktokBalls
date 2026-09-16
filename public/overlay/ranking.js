const socket =
    io();


const ranking =
    document.querySelector(
        '#ranking'
    );


let rankingSettings = {
    rankingLimit: 10,

    rankingFontFamily:
        'Verdana',

    rankingFontSize:
        26,

    rankingFontWeight:
        '700',

    rankingTextColor:
        '#ffffff',

    rankingTitleColor:
        '#5ee7ff',

    rankingPointsColor:
        '#ffe66d',

    rankingTitleSize:
        32
};


function getDisplayName(player) {
    return (
        player.nickname ||
        player.username ||
        player.uniqueId ||
        'viewer'
    );
}


function getNumber(
    value,
    fallback
) {
    const parsed =
        Number(value);


    return Number.isFinite(parsed)
        ? parsed
        : fallback;
}


function applyRankingSettings() {
    ranking.style.setProperty(
        '--ranking-font-family',
        rankingSettings.rankingFontFamily ||
        'Verdana'
    );


    ranking.style.setProperty(
        '--ranking-font-size',
        `${getNumber(
            rankingSettings.rankingFontSize,
            26
        )}px`
    );


    ranking.style.setProperty(
        '--ranking-font-weight',
        rankingSettings.rankingFontWeight ||
        '700'
    );


    ranking.style.setProperty(
        '--ranking-text-color',
        rankingSettings.rankingTextColor ||
        '#ffffff'
    );


    ranking.style.setProperty(
        '--ranking-title-color',
        rankingSettings.rankingTitleColor ||
        '#5ee7ff'
    );


    ranking.style.setProperty(
        '--ranking-points-color',
        rankingSettings.rankingPointsColor ||
        '#ffe66d'
    );


    ranking.style.setProperty(
        '--ranking-title-size',
        `${getNumber(
            rankingSettings.rankingTitleSize,
            32
        )}px`
    );
}


function renderRanking(players) {
    ranking.innerHTML =
        '';


    applyRankingSettings();


    const panel =
        document.createElement(
            'section'
        );


    panel.className =
        'ranking-panel';


    const title =
        document.createElement(
            'h1'
        );


    title.className =
        'ranking-title';


    title.textContent =
        'Ranking';


    panel.appendChild(
        title
    );


    const limit =
        Math.max(
            1,
            Math.floor(
                getNumber(
                    rankingSettings.rankingLimit,
                    10
                )
            )
        );


    const sortedPlayers =
        [...players]
            .sort(
                (first, second) =>
                    Number(
                        second.points || 0
                    ) -
                    Number(
                        first.points || 0
                    )
            )
            .slice(
                0,
                limit
            );


    sortedPlayers.forEach(
        (player, index) => {
            const row =
                document.createElement(
                    'div'
                );


            row.className =
                'ranking-row';


            const position =
                document.createElement(
                    'span'
                );


            position.className =
                'ranking-position';


            position.textContent =
                `${index + 1}.`;


            const name =
                document.createElement(
                    'span'
                );


            name.className =
                'ranking-name';


            name.textContent =
                getDisplayName(
                    player
                );


            const points =
                document.createElement(
                    'span'
                );


            points.className =
                'ranking-points';


            points.textContent =
                Math.floor(
                    Number(
                        player.points || 0
                    )
                );


            row.appendChild(
                position
            );


            row.appendChild(
                name
            );


            row.appendChild(
                points
            );


            panel.appendChild(
                row
            );
        }
    );


    ranking.appendChild(
        panel
    );
}


function handleState(state) {
    if (!state) {
        return;
    }


    rankingSettings = {
        ...rankingSettings,
        ...(state.settings || {})
    };


    renderRanking(
        state.players || []
    );
}


socket.on(
    'state:init',
    handleState
);


socket.on(
    'state:update',
    handleState
);


socket.on(
    'state',
    handleState
);
const socket =
    io();


const podium =
    document.querySelector(
        '#podium'
    );


let podiumSettings = {
    podiumLimit: 10,

    podiumFontFamily:
        'Verdana',

    podiumFontSize:
        26,

    podiumFontWeight:
        '700',

    podiumTextColor:
        '#ffffff',

    podiumTitleColor:
        '#ffe66d',

    podiumWinsColor:
        '#ffe66d',

    podiumTitleSize:
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


function applyPodiumSettings() {
    podium.style.setProperty(
        '--podium-font-family',
        podiumSettings.podiumFontFamily ||
        'Verdana'
    );


    podium.style.setProperty(
        '--podium-font-size',
        `${getNumber(
            podiumSettings.podiumFontSize,
            26
        )}px`
    );


    podium.style.setProperty(
        '--podium-font-weight',
        podiumSettings.podiumFontWeight ||
        '700'
    );


    podium.style.setProperty(
        '--podium-text-color',
        podiumSettings.podiumTextColor ||
        '#ffffff'
    );


    podium.style.setProperty(
        '--podium-title-color',
        podiumSettings.podiumTitleColor ||
        '#ffe66d'
    );


    podium.style.setProperty(
        '--podium-wins-color',
        podiumSettings.podiumWinsColor ||
        '#ffe66d'
    );


    podium.style.setProperty(
        '--podium-title-size',
        `${getNumber(
            podiumSettings.podiumTitleSize,
            32
        )}px`
    );
}


function renderPodium(players) {
    podium.innerHTML =
        '';


    applyPodiumSettings();


    const panel =
        document.createElement(
            'section'
        );


    panel.className =
        'podium-panel';


    const title =
        document.createElement(
            'h1'
        );


    title.className =
        'podium-title';


    title.textContent =
        '🏆 Podio histórico';


    panel.appendChild(
        title
    );


    const limit =
        Math.max(
            1,
            Math.floor(
                getNumber(
                    podiumSettings.podiumLimit,
                    10
                )
            )
        );


    players
        .slice(
            0,
            limit
        )
        .forEach(
            (player, index) => {
                const row =
                    document.createElement(
                        'div'
                    );


                row.className =
                    'podium-row';


                const position =
                    document.createElement(
                        'span'
                    );


                position.className =
                    'podium-position';


                position.textContent =
                    `${index + 1}.`;


                const name =
                    document.createElement(
                        'span'
                    );


                name.className =
                    'podium-name';


                name.textContent =
                    getDisplayName(
                        player
                    );


                const wins =
                    document.createElement(
                        'span'
                    );


                wins.className =
                    'podium-wins';


                wins.textContent =
                    `${player.wins || 0} 🏆`;


                row.appendChild(
                    position
                );


                row.appendChild(
                    name
                );


                row.appendChild(
                    wins
                );


                panel.appendChild(
                    row
                );
            }
        );


    podium.appendChild(
        panel
    );
}


function handleState(state) {
    if (!state) {
        return;
    }


    podiumSettings = {
        ...podiumSettings,
        ...(state.settings || {})
    };


    const game =
        state.game || {};


    renderPodium(
        game.podium || []
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
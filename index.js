import WebSocketManager from './js/socket.js';


// connecting to websocket
const socket = new WebSocketManager(window.location.host);



// cache values here to prevent constant updating
const contents = {};
let settingsInitialized = false;

let api = "";
let axios = window.axios;
let uid = "";

const FILTERS_V2 = [
    'play',
    'profile',
    'leaderboard',
    'state',
    'beatmap',
    'clients'
]


// made by sky(@s2skky)
// 名字和分数切换
let switchTimer = null;
let showingName = true;

function startSwitch() {
    if (switchTimer) clearInterval(switchTimer);
    showingName = true;

    switchTimer = setInterval(() => {
        const allIds = document.querySelectorAll('[id^="rank_id_"]');
        const allScores = document.querySelectorAll('[id^="rank_score_"]');

        showingName = !showingName;

        allIds.forEach(el => {
            el.style.transition = 'transform 0.4s ease-in-out, opacity 0.4s ease-in-out';
            el.style.transform = showingName ? 'translateY(0)' : 'translateY(-25px)';
            el.style.opacity = showingName ? '1' : '0';
        });

        allScores.forEach(el => {
            el.style.transition = 'transform 0.4s ease-in-out, opacity 0.4s ease-in-out';
            el.style.transform = showingName ? 'translateY(25px)' : 'translateY(0)';
            el.style.opacity = showingName ? '0' : '1';
        });
    }, 4000);
}
// no touch

let t_player;
let t_score = 0;

let bg_value = '';

let p_index;
const PROFILE_HIDE = 1;
const PROFILE_REVEAL = 2;


let s_index;
const SUB_ACC = 1;
const SUB_COMBO = 2;
const SUB_NONE = 0;

const RANKED_STATUS_UNKNOWN = 0;
const RANKED_STATUS_NOT_SUBMITTED = 1;
const RANKED_STATUS_PENDING = 2;
const RANKED_STATUS_RANKED = 4;
const RANKED_STATUS_APPROVED = 5;
const RANKED_STATUS_QUALIFIED = 6;
const RANKED_STATUS_LOVED = 7;


let state;
let beatmap_score = {};
let beatmap_data = {};
/** @type {import('./js/socket.js').WEBSOCKET_V2_LEADERBOARD[]} */
let slots = [];

let rank_container = document.getElementById("rank_container");
let leaderboard_section = document.getElementById("leaderboard_section");
let rank_box_now;
let rank_score_now;
let rank_percent_now;
let rank_now;

let isCompleteRank = false;
let position = 0;
let temp = true;
let ranked_check = 0;

var v2 = 0x20000000;

/** @type {LeaderboardSlot[]} */
let leaderboard = [];

const LEADERBOARD_SLOT = 0;
const LEADERBOARD_API = 1;
let leaderboard_type = LEADERBOARD_SLOT;

/**
 * @typedef {Object} LeaderboardSlot
 * @property {string} id
 * @property {string} name
 * @property {number} score
 * @property {number} maxCombo
 * @property {number} accuracy
 * @property {object} hits
 * @property {number} hits.300
 * @property {number} hits.100
 * @property {number} hits.50
 * @property {number} hits.miss
 * @property {number} hits.katu
 * @property {number} hits.geki
 */

/**
 * @param {import('./js/socket.js').WEBSOCKET_V2_LEADERBOARD} slot 
 * @returns {LeaderboardSlot}
 */
function slotToLeaderboardSlot(slot) {
    return {
        id: slot.id,
        name: slot.name,
        score: slot.score,
        maxCombo: slot.combo.max,
        accuracy: slot.accuracy,
        hits: slot.hits
    };
}

/**
 * @param {object} beatmapScore 
 * @returns {LeaderboardSlot}
 */
function beatmapScoreToLeaderboardSlot(beatmapScore) {
    let hits = {
        300: parseInt(beatmapScore["count300"]),
        100: parseInt(beatmapScore["count100"]),
        50: parseInt(beatmapScore["count50"]),
        "miss": parseInt(beatmapScore["countmiss"]),
        "katu": parseInt(beatmapScore["countkatu"]),
        "geki": parseInt(beatmapScore["countgeki"])
    }
    let acc_1 = 50 * hits[50] + 100 * hits[100] + 200 * hits["katu"] + 300 * (hits[300] + hits["geki"]);
    let acc_2 = 300 * (hits["miss"] + hits[50] + hits[100] + hits["katu"] + hits[300] + hits["geki"]);
    let accuracy = acc_1 / acc_2 * 100;
    return {
        id: beatmapScore["user_id"],
        name: beatmapScore["username"],
        score: parseInt(beatmapScore["score"]),
        maxCombo: parseInt(beatmapScore["maxcombo"]),
        accuracy: accuracy,
        hits: hits
    };
}

socket.sendCommand('getSettings', encodeURI(window.COUNTER_PATH));

socket.commands((data) => {
    try {
        const { command, message } = data;

        if (command == 'getSettings') {
            if (message['api'] != null) {
                contents.api = message['api'];
                api = contents.api;
            }

            if (message['background'] != null) {
                contents.background = message['background'];

                if (contents.background == "black") {
                    bg_value = 'rgba( 0, 0, 0, 0.35 )';
                }
                else if (contents.background == "white") {
                    bg_value = 'rgba( 255, 255, 255, 0.1 )';
                }
            }

            if (message['opacity'] != null) {
                contents.opacity = message['opacity'];

                if (contents.opacity == "100%") {
                    leaderboard_section.style.background = "black";
                }
                else if (contents.opacity == "0%") {
                    leaderboard_section.style.background = "";
                }
            }

            if (message['profile'] != null) {
                contents.profile = message['profile'];

                if (contents.profile == "hide") {
                    p_index = PROFILE_HIDE;
                }
                else if (contents.profile == "reveal") {
                    p_index = PROFILE_REVEAL;
                }
            }

            if (message['sub'] != null) {
                contents.sub = message['sub'];

                if (contents.sub == "acc") {
                    s_index = SUB_ACC;
                }
                else if (contents.sub == "combo") {
                    s_index = SUB_COMBO;
                }
                else {
                    s_index = SUB_NONE;
                }

            }

            if (message['uid'] != null) {
                contents.uid = message['uid'];
                uid = contents.uid;
            }
            settingsInitialized = true;
        }
    } catch (error) {
        console.log(error);
    }
});


function isEmptyObject(param) {
    return Object.keys(param).length === 0 && param.constructor === Object;
}

function formatAccuracy(accuracy) {
    return accuracy.toFixed(2) + '%';
}
function formatCombo(combo) {
    return combo.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'x';
}

function scoreV2ComboValue(comboIndex, firstObjectValue, logBase, logThreshold) {
    if (comboIndex <= 1) {
        return firstObjectValue;
    }
    if (comboIndex < logThreshold) {
        return Math.log(comboIndex) / Math.log(logBase);
    }
    return Math.log(logThreshold) / Math.log(logBase);
}

function scoreV2ComboSum(startCombo, objectCount, firstObjectValue, logBase, logThreshold, maxHitValue) {
    let comboSum = 0;
    for (let k = 1; k <= objectCount; k++) {
        comboSum += maxHitValue * scoreV2ComboValue(startCombo + k, firstObjectValue, logBase, logThreshold);
    }
    return comboSum;
}

/**
 * Predicts the final osu! ScoreV2 score if every remaining object is hit as MAX.
 *
 * @param {number} totalObjects N, the total number of hit objects in the map.
 * @param {number} currentObjects t, the number of hit objects already played.
 * @param {number} currentCombo combo, reset to 0 after a miss.
 * @param {number} currentAccuracy acc, from 0 to 1.
 * @param {number} currentScore score_now, the current ScoreV2 score.
 * @param {number} accuracyScoreWeight ScoreV2 accuracy component weight.
 * @param {number} comboScoreWeight ScoreV2 combo component weight.
 * @param {number} maxHitValue Maximum hit value used by the combo sum.
 * @param {number} firstObjectValue f(1).
 * @param {number} logBase Base used by f(i)'s logarithm.
 * @param {number} logThreshold Combo index where f(i) caps.
 * @returns {number}
 */
function predictFinalScoreV2Score(
    totalObjects, currentObjects, currentCombo, currentAccuracy, currentScore,
    accuracyScoreWeight = 800000,
    comboScoreWeight = 200000,
    maxHitValue = 300,
    firstObjectValue = 0.5,
    logBase = 4,
    logThreshold = 400
) {
    if (totalObjects <= 0 || currentObjects < 0 || currentObjects > totalObjects) {
        return 0;
    }
    if (currentObjects === 0) {
        return accuracyScoreWeight + comboScoreWeight;
    }

    const accuracy = Math.max(0, Math.min(1, currentAccuracy));
    const remainingObjects = totalObjects - currentObjects;
    const currentAccuracyScore = accuracyScoreWeight * Math.pow(accuracy, 2 + 2 * accuracy) * currentObjects / totalObjects;
    const currentComboScore = currentScore - currentAccuracyScore;
    const maxComboSum = scoreV2ComboSum(0, totalObjects, firstObjectValue, logBase, logThreshold, maxHitValue);

    if (maxComboSum <= 0) {
        return 0;
    }

    const futureComboSum = scoreV2ComboSum(currentCombo, remainingObjects, firstObjectValue, logBase, logThreshold, maxHitValue);
    const finalAccuracy = (accuracy * currentObjects + remainingObjects) / totalObjects;
    const finalComboScore = currentComboScore + comboScoreWeight * futureComboSum / maxComboSum;
    const finalAccuracyScore = accuracyScoreWeight * Math.pow(finalAccuracy, 2 + 2 * finalAccuracy);

    console.log({
        accuracy,
        remainingObjects,
        totalObjects,
        currentScore,
        currentComboScore,
        currentAccuracyScore,
        futureComboSum,
        maxComboSum,
        finalComboScore,
        finalAccuracyScore,
        finalAccuracy
    });
    return finalComboScore + finalAccuracyScore;
}

function setSubsection(subsection, accuracy, combo) {
    if (s_index == SUB_ACC) {
        subsection.innerHTML = formatAccuracy(accuracy);
        subsection.style.opacity = 1;
    }
    else if (s_index == SUB_COMBO) {
        subsection.innerHTML = formatCombo(combo);
        subsection.style.opacity = 1;
    }
    else {
        subsection.style.opacity = 0;
    }

}

/**
 * @param {LeaderboardSlot[]} slots 
 * @param {string} rankingTitle 
 */
function load_slots(slots, rankingTitle) {
    for (var i = 0; i < slots.length - 1; i++) {
        if (p_index == PROFILE_REVEAL) {
            rank_container.innerHTML += '<div id="rank_' + i + '" class="rank_box"> \n';
        } else if (p_index == PROFILE_HIDE) {
            rank_container.innerHTML += '<div id="rank_' + i + '" class="rank_box_hide"> \n';
        }
        let rank_temp = document.getElementById(`rank_${i}`);
        rank_temp.style.top = (88 * i) + 'px';

        if (p_index == PROFILE_REVEAL) {
            rank_temp.innerHTML = '<div id="rank_pic_' + i + '" class="rank_pic"></div> \n <div id="rank_pic_opa"></div> \n <div id="rank_id_' + i + '" class="rank_id"></div> \n <div id="rank_score_' + i + '" class="rank_score">0</div> \n <div id="rank_percent_' + i + '" class="rank_percent">00.00%</div> \n <div id="rank_number_' + i + '" class="rank">#' + (i + 1) + '</div>';
            let rank_pic = document.getElementById(`rank_pic_${i}`);
            rank_pic.style.backgroundImage = `url('https://a.ppy.sh/${slots[i].id}')`;
        } else if (p_index == PROFILE_HIDE) {
            rank_temp.innerHTML = '<div id="rank_id_' + i + '" class="rank_id_hide"></div> \n <div id="rank_score_' + i + '" class="rank_score_hide">0</div> \n <div id="rank_percent_' + i + '" class="rank_percent">00.00%</div> \n <div id="rank_number_' + i + '" class="rank_hide">#' + (i + 1) + '</div>';
        }

        let rank_id = document.getElementById(`rank_id_${i}`);
        let rank_score = document.getElementById(`rank_score_${i}`);
        let rank_percent = document.getElementById(`rank_percent_${i}`);
        rank_id.innerHTML = slots[i].name;
        rank_score.innerHTML = slots[i].score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        setSubsection(rank_percent, slots[i].accuracy, slots[i].maxCombo);

        rank_id.style.color = '#949D9D';
        rank_score.style.color = '#949D9D';
        rank_percent.style.color = '#5A8D8F';
    }
    if (p_index == PROFILE_REVEAL) {
        rank_container.innerHTML += '<div id="rank_box_now" class="rank_box"> \n';
    } else if (p_index == PROFILE_HIDE) {
        rank_container.innerHTML += '<div id="rank_box_now" class="rank_box_hide"> \n';
    }
    let rank_temp = document.getElementById(`rank_box_now`);
    rank_temp.style.top = ((slots.length - 1) * 88) + 'px';

    if (p_index == PROFILE_REVEAL) {
        rank_temp.innerHTML = '<div id="rank_pic_now" class="rank_pic"></div> \n <div id="rank_id_now" class="rank_id"></div> \n <div id="rank_score_now" class="rank_score">0</div> \n <div id="rank_percent_now" class="rank_percent">00.00%</div> \n <div id="rank_now" class="rank">#?</div>';
        let rank_pic = document.getElementById("rank_pic_now");
        rank_pic.style.backgroundImage = `url('https://a.ppy.sh/${uid}')`;
    } else if (p_index == PROFILE_HIDE) {
        rank_temp.innerHTML = '<div id="rank_id_now" class="rank_id_hide"></div> \n <div id="rank_score_now" class="rank_score_hide">0</div> \n <div id="rank_percent_now" class="rank_percent">00.00%</div> \n <div id="rank_now" class="rank_hide">#?</div>';
    }

    let rank_id = document.getElementById("rank_id_now");
    //rank_pic.style.backgroundImage = "url('parts/profile.png')";
    rank_id.innerHTML = t_player;

    rank_score_now = document.getElementById("rank_score_now");
    rank_percent_now = document.getElementById("rank_percent_now");
    rank_now = document.getElementById("rank_now");
    rank_box_now = document.getElementById("rank_box_now");

    isCompleteRank = true;
    position = slots.length - 1;

    if (slots.length - 1 <= 4) {
        rank_container.style.top = '0px';
    }
    //#1, #2, #3
    else if (position == 0 || position == 1 || position == 2) {
        rank_container.style.top = '0px';
    } //#51, #50, #49
    else if (position == slots.length - 1 || position == (slots.length - 2) || position == (slots.length - 3)) {
        rank_container.style.top = ((0 - (slots.length - 8)) * 88) + 'px';
    } else {
        rank_container.style.top = (0 - (position - 2) * 88) + 'px';
    }
    leaderboard_section.style.opacity = 1;
    document.getElementById("ranking_title").style.opacity = "1";
    document.getElementById("ranking_title").innerText = rankingTitle;
    startSwitch();
}

/**
 * @param {number} expected_temp 
 */
function update_leaderboard(expected_temp) {
    temp = true;
    while (temp == true) {
        if (position == 0) {
            // 포지션이 최상단 일 떄
            if (expected_temp <= leaderboard[position].score) {
                let rank_down_box = document.getElementById(`rank_${position}`);
                let rank_down_box_number = document.getElementById(`rank_number_${position}`);
                rank_down_box.style.top = (position * 88) + 'px';
                rank_box_now.style.top = ((position + 1) * 88) + 'px';
                position = position + 1;
                rank_now.innerHTML = '#' + (position + 1);
                rank_down_box_number.innerHTML = '#' + (position);
            } else {
                temp = false;
                break;
            }
        } else {
            if (expected_temp > leaderboard[position - 1].score) {
                let rank_up_box = document.getElementById(`rank_${position - 1}`);
                let rank_up_box_number = document.getElementById(`rank_number_${position - 1}`);
                rank_up_box.style.top = (position * 88) + 'px';
                rank_box_now.style.top = ((position - 1) * 88) + 'px';
                position = position - 1;
                rank_now.innerHTML = '#' + (position + 1);
                rank_up_box_number.innerHTML = '#' + (position + 2);

                if (leaderboard.length - 1 <= 4) {
                    rank_container.style.top = '0px';
                } else if (position == 0 || position == 1 || position == 2) {
                    rank_container.style.top = '0px';
                } else if (position == leaderboard.length - 1 || position == (leaderboard.length - 2) || position == (leaderboard.length - 3)) {
                    rank_container.style.top = ((0 - (leaderboard.length - 8)) * 88) + 'px';
                } else {
                    rank_container.style.top = (0 - (position - 2) * 88) + 'px';
                }
            } else {
                if (position == leaderboard.length - 1) {
                    if (leaderboard.length - 1 >= 100) {
                        rank_now.innerHTML = '#Out';
                    } else {
                        rank_now.innerHTML = '#' + (leaderboard.length);
                    }
                    temp = false;
                    break;
                } else {
                    if (expected_temp <= leaderboard[position].score) {
                        let rank_down_box = document.getElementById(`rank_${position}`);
                        let rank_down_box_number = document.getElementById(`rank_number_${position}`);
                        rank_down_box.style.top = ((position) * 88) + 'px';
                        rank_box_now.style.top = ((position + 1) * 88) + 'px';
                        position = position + 1;
                        rank_now.innerHTML = '#' + (position + 1);
                        rank_down_box_number.innerHTML = '#' + (position);

                        if (leaderboard.length - 1 <= 4) {
                            rank_container.style.top = '0px';
                        } else if (position == 0 || position == 1 || position == 2) {
                            rank_container.style.top = '0px';
                        } else if (position == leaderboard.length - 1 || position == (leaderboard.length - 2) || position == (leaderboard.length - 3)) {
                            rank_container.style.top = ((0 - (leaderboard.length - 8)) * 88) + 'px';
                        } else {
                            rank_container.style.top = (0 - (position - 2) * 88) + 'px';
                        }
                    } else {
                        temp = false;
                        break;
                    }

                }
            }
        }
    }
}

function reset() {

    beatmap_data = {};
    beatmap_score = {};

    isCompleteRank = false;
    leaderboard_section.style.opacity = 0;
    document.getElementById("ranking_title").style.opacity = "0";

    ranked_check = 0;

    rank_container.innerHTML = '';
    position = 0;
    rank_container.style.top = '-6900px';
    slots = [];

    leaderboard = [];
    leaderboard_type = LEADERBOARD_SLOT;
}

socket.api_v2((data) => {
    try {
        if (!settingsInitialized) {
            return;
        }

        let play = data.play;
        api = contents.api;
        uid = contents.uid;

        t_player = play.playerName;
        if (t_player == '') {
            t_player = "unknown";
        }

        if (slots !== data.leaderboard && state === "play") {
            slots = data.leaderboard;
            if (leaderboard_type === LEADERBOARD_SLOT) {
                leaderboard = data.leaderboard.map(slotToLeaderboardSlot);
            }
        }

        /** @type {number} */
        let t_total = play.hits.geki + play.hits[300] + play.hits.katu + play.hits[100] + play.hits[50] + play.hits[0];

        let beatmapId = data.beatmap.id;
        let rankedStatus = data.beatmap.status.number;
        let mods = data.play.mods.number;

        const score_v2 = (mods & v2) === v2;
        const hasOnlineLeaderboard = rankedStatus == RANKED_STATUS_RANKED || rankedStatus == RANKED_STATUS_QUALIFIED || rankedStatus == RANKED_STATUS_LOVED;

        if (state !== data.state.name) {
            state = data.state.name;
            console.log(data.state)

            if (state === "play") {
                console.log(data.beatmap.status);
                axios.all([axios.get("/get_beatmaps", {
                    baseURL: "https://osu.ppy.sh/api",
                    params: {
                        k: `${api}`,
                        b: `${beatmapId}`,
                    },
                }), axios.get("/get_scores", {
                    baseURL: "https://osu.ppy.sh/api",
                    params: {
                        k: `${api}`,
                        b: `${beatmapId}`,
                        m: `3`,
                        limit: 100 // 1-100
                    },
                })]).then(axios.spread((firstResp, secondResp) => {
                    Promise.resolve(firstResp.data[0]).then((data) => Object.assign(beatmap_data, data));
                    Promise.resolve(secondResp.data).then((data) => {
                        Object.assign(beatmap_score, data);
                        if (data.length > slots.length) {
                            leaderboard_type = LEADERBOARD_API;
                            leaderboard = data.map(beatmapScoreToLeaderboardSlot);
                        }
                    });
                })).catch((error) => {
                    console.error(error);
                });
                setTimeout(function () {
                    console.log(leaderboard);
                    if (leaderboard !== null) {
                        load_slots(leaderboard, "Ranking");
                    }
                }, 1000);
            } else {
                reset();
            }
        }

        if (t_score !== play.score) {
            t_score = play.score;

            if (isCompleteRank == true) {

                if (rankedStatus == RANKED_STATUS_UNKNOWN) {
                    if (isEmptyObject(beatmap_data) !== true) {
                        var s = beatmap_data.approved;
                        if (s == 4 || s == 3 || s == 2 || s == 1) {
                            ranked_check = 1;
                        }
                        else if (s == 0 || s == -1 || s == -2) {
                            ranked_check = 2;
                        }
                    }
                }
                let expected_temp = 0;
                if (score_v2) {
                    let total_hits = data.beatmap.stats.objects.total + data.beatmap.stats.objects.holds;
                    expected_temp = predictFinalScoreV2Score(
                        total_hits,
                        t_total,
                        play.combo.current,
                        play.accuracy / 100,
                        t_score
                    ).toFixed(0);
                } else if (t_total == 0) {
                    expected_temp = 0;
                } else if (play.hits[300] + play.hits.katu + play.hits[100] + play.hits[50] + play.hits[0] == 0) {
                    expected_temp = 1000000;
                } else {
                    expected_temp = (t_score / (1000000 / data.beatmap.stats.objects.total * t_total) * 1000000).toFixed(0);
                }
                rank_score_now.innerHTML = expected_temp.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                setSubsection(rank_percent_now, play.accuracy, play.combo.current);
                update_leaderboard(expected_temp);
            }
        }
    } catch (err) {
        console.log(err);
    };
}, FILTERS_V2);

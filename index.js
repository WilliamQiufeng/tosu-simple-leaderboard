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
let t_total;

let bg_value = '';

let p_index;
const PROFILE_HIDE = 1;
const PROFILE_REVEAL = 2;


let s_index;
const SUB_ACC = 1;
const SUB_COMBO = 2;

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

function create_ranking_panel() {
    if (isEmptyObject(beatmap_score) !== true) {
        /*for(var i = 0; i < 49; i++){
            beatmap_score[i] = beatmap_score[i+1];
        }
        delete beatmap_score[49];
        console.log(beatmap_score);*/

        for (var i = 0; i < Object.keys(beatmap_score).length; i++) {
            if (p_index == PROFILE_REVEAL) {
                rank_container.innerHTML += '<div id="rank_' + i + '" class="rank_box"> \n';
            }
            else if (p_index == PROFILE_HIDE) {
                rank_container.innerHTML += '<div id="rank_' + i + '" class="rank_box_hide"> \n';
            }
            let rank_temp = document.getElementById(`rank_${i}`);
            rank_temp.style.backgroundColor = bg_value;
            rank_temp.style.top = (88 * i) + 'px';

            if (p_index == PROFILE_REVEAL) {
                rank_temp.innerHTML = '<div id="rank_pic_' + i + '" class="rank_pic"></div> \n <div id="rank_pic_opa"></div> \n <div id="rank_id_' + i + '" class="rank_id"></div> \n <div id="rank_score_' + i + '" class="rank_score">0</div> \n <div id="rank_percent_' + i + '" class="rank_percent">00.00%</div> \n <div id="rank_number_' + i + '" class="rank">#' + (i + 1) + '</div>';
                let rank_pic = document.getElementById(`rank_pic_${i}`);
                rank_pic.style.backgroundImage = `url('https://a.ppy.sh/${beatmap_score[i].user_id}')`;
            }
            else if (p_index == PROFILE_HIDE) {
                rank_temp.innerHTML = '<div id="rank_id_' + i + '" class="rank_id_hide"></div> \n <div id="rank_score_' + i + '" class="rank_score_hide">0</div> \n <div id="rank_percent_' + i + '" class="rank_percent">00.00%</div> \n <div id="rank_number_' + i + '" class="rank_hide">#' + (i + 1) + '</div>';
            }

            let rank_id = document.getElementById(`rank_id_${i}`);
            let rank_score = document.getElementById(`rank_score_${i}`);
            let rank_percent = document.getElementById(`rank_percent_${i}`);

            rank_id.innerHTML = beatmap_score[i].username;
            rank_score.innerHTML = beatmap_score[i].score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            rank_id.style.color = '#949D9D';
            rank_score.style.color = '#949D9D';
            rank_percent.style.color = '#5A8D8F';

            if (s_index == SUB_ACC) {
                let acc_1 = (50 * parseInt(beatmap_score[i].count50) + 100 * parseInt(beatmap_score[i].count100) + 200 * parseInt(beatmap_score[i].countkatu) + 300 * (parseInt(beatmap_score[i].count300) + parseInt(beatmap_score[i].countgeki)));
                let acc_2 = 300 * (parseInt(beatmap_score[i].countmiss) + parseInt(beatmap_score[i].count50) + parseInt(beatmap_score[i].count100) + parseInt(beatmap_score[i].countkatu) + parseInt(beatmap_score[i].count300) + parseInt(beatmap_score[i].countgeki));
                rank_percent.innerHTML = (acc_1 / acc_2 * 100).toFixed(2) + '%';
            }
            else if (s_index == SUB_COMBO) {
                rank_percent.innerHTML = beatmap_score[i].maxcombo.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'x';
            }

        }
        if (p_index == PROFILE_REVEAL) {
            rank_container.innerHTML += '<div id="rank_box_now" class="rank_box"> \n';
        }
        else if (p_index == PROFILE_HIDE) {
            rank_container.innerHTML += '<div id="rank_box_now" class="rank_box_hide"> \n';
        }
        let rank_temp = document.getElementById(`rank_box_now`);
        rank_temp.style.backgroundColor = bg_value;
        rank_temp.style.top = (Object.keys(beatmap_score).length * 88) + 'px';

        if (p_index == PROFILE_REVEAL) {
            rank_temp.innerHTML = '<div id="rank_pic_now" class="rank_pic"></div> \n <div id="rank_id_now" class="rank_id"></div> \n <div id="rank_score_now" class="rank_score">0</div> \n <div id="rank_percent_now" class="rank_percent">00.00%</div> \n <div id="rank_now" class="rank">#?</div>';
            let rank_pic = document.getElementById("rank_pic_now");
            rank_pic.style.backgroundImage = `url('https://a.ppy.sh/${uid}')`;
        }
        else if (p_index == PROFILE_HIDE) {
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
        position = Object.keys(beatmap_score).length;


        if (Object.keys(beatmap_score).length <= 4) {
            rank_container.style.top = '0px';
        }
        else if (position == 0 || position == 1 || position == 2) {
            rank_container.style.top = '0px';
        }
        else if (position == Object.keys(beatmap_score).length || position == (Object.keys(beatmap_score).length - 1) || position == (Object.keys(beatmap_score).length) - 2) {
            rank_container.style.top = (0 - (Object.keys(beatmap_score).length - 7) * 88) + 'px';
        } else {
            rank_container.style.top = (0 - (position - 2) * 88) + 'px';
        }
        leaderboard_section.style.opacity = 1;
        document.getElementById("ranking_title").style.opacity = "1";
        document.getElementById("ranking_title").innerText = "Global Ranking";
        startSwitch();

    }
}

/**
 * 
 * @param {import('./js/socket.js').WEBSOCKET_V2_LEADERBOARD[]} slots 
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
            rank_pic.style.backgroundImage = `url('https://a.ppy.sh/')`;
        } else if (p_index == PROFILE_HIDE) {
            rank_temp.innerHTML = '<div id="rank_id_' + i + '" class="rank_id_hide"></div> \n <div id="rank_score_' + i + '" class="rank_score_hide">0</div> \n <div id="rank_percent_' + i + '" class="rank_percent">00.00%</div> \n <div id="rank_number_' + i + '" class="rank_hide">#' + (i + 1) + '</div>';
        }

        let rank_id = document.getElementById(`rank_id_${i}`);
        let rank_score = document.getElementById(`rank_score_${i}`);
        let rank_percent = document.getElementById(`rank_percent_${i}`);
        rank_id.innerHTML = slots[i].name;
        rank_score.innerHTML = slots[i].score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        rank_percent.innerHTML = slots[i].combo.max.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'x';

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
        }
        if (t_total !== play.hits.geki + play.hits[300] + play.hits.katu + play.hits[100] + play.hits[50] + play.hits[0]) {
            t_total = play.hits.geki + play.hits[300] + play.hits.katu + play.hits[100] + play.hits[50] + play.hits[0];
        }

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
                    Promise.resolve(secondResp.data).then((data) => Object.assign(beatmap_score, data));
                })).catch((error) => {
                    console.error(error);
                });
                if (rankedStatus == RANKED_STATUS_UNKNOWN) {
                    setTimeout(function () {
                        if (isEmptyObject(beatmap_data) !== true) {
                            var s = beatmap_data.approved;
                            if (s == 4 || s == 3 || s == 2 || s == 1) {
                                create_ranking_panel();
                            }
                            else if (s == 0 || s == -1 || s == -2) {
                                if (slots !== null) {
                                    load_slots(slots, "Global Ranking");
                                }
                            }
                        }
                    }, 1000);
                }
                else if (hasOnlineLeaderboard) {
                    setTimeout(create_ranking_panel, 1000);
                } else if (rankedStatus == RANKED_STATUS_PENDING) { //pending(no ranking)
                    setTimeout(function () {
                        if (slots !== null) {
                            load_slots(slots, "Local Ranking");
                        }
                    }, 1000);
                }
            } else {
                beatmap_data = {};
                beatmap_score = {};

                isCompleteRank = false;
                leaderboard_section.style.opacity = 0;
                document.getElementById("ranking_title").style.opacity = "0";

                ranked_check = 0;

                setTimeout(function () {
                    rank_container.innerHTML = '';
                    position = 0;
                    rank_container.style.top = '-6900px';
                    temp = true;
                    slots = {};
                }, 500);
            }
        }

        if (state !== "play") {

            beatmap_data = {};
            beatmap_score = {};

            leaderboard_section.style.opacity = 0;
            document.getElementById("ranking_title").style.opacity = "0";
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
                if (t_total == 0) {
                    expected_temp = 0;
                } else if (play.hits[300] + play.hits.katu + play.hits[100] + play.hits[50] + play.hits[0] == 0) {
                    expected_temp = 1000000;
                } else {
                    expected_temp = (t_score / (1000000 / (parseInt(beatmap_data.count_normal) + parseInt(beatmap_data.count_slider)) * (t_total)) * 1000000).toFixed(0);
                }
                rank_score_now.innerHTML = expected_temp.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                if (t_total !== 0) {
                    if (hasOnlineLeaderboard || ranked_check == 1) {
                        if (s_index == SUB_ACC) {
                            let acc_1 = 50 * play.hits[50] + 100 * play.hits[100] + 200 * play.hits.katu + 300 * (play.hits[300] + play.hits.geki);
                            let acc_2 = 300 * (play.hits[300] + play.hits.katu + play.hits[100] + play.hits[50] + play.hits[0] + play.hits.geki);
                            rank_percent_now.innerHTML = (acc_1 / acc_2 * 100).toFixed(2) + '%';
                        }
                        else if (s_index == SUB_COMBO) {
                            rank_percent_now.innerHTML = play.combo.max.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'x';
                        }
                    } else if (rankedStatus == RANKED_STATUS_PENDING || ranked_check == 2) {
                        rank_percent_now.innerHTML = play.combo.max.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'x';
                    }
                }

                temp = true;
                if (hasOnlineLeaderboard || ranked_check == 1) {
                    while (temp == true) {
                        if (position == 0) {
                            if (expected_temp <= beatmap_score[position].score) {
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
                            if (expected_temp > parseInt(beatmap_score[position - 1].score)) {
                                let rank_up_box = document.getElementById(`rank_${position - 1}`);
                                let rank_up_box_number = document.getElementById(`rank_number_${position - 1}`);
                                rank_up_box.style.top = (position * 88) + 'px';
                                rank_box_now.style.top = ((position - 1) * 88) + 'px';
                                position = position - 1;
                                rank_up_box_number.innerHTML = '#' + (position + 2);
                                rank_now.innerHTML = '#' + (position + 1);
                                if (Object.keys(beatmap_score).length <= 4) {
                                    rank_container.style.top = '0px';
                                } else if (position == 0 || position == 1 || position == 2) {
                                    rank_container.style.top = '0px';
                                } else if (position == Object.keys(beatmap_score).length || position == (Object.keys(beatmap_score).length - 1) || position == (Object.keys(beatmap_score).length) - 2) {
                                    rank_container.style.top = (0 - (Object.keys(beatmap_score).length - 7) * 88) + 'px';
                                } else {
                                    rank_container.style.top = (0 - (position - 2) * 88) + 'px';
                                }
                            } else {
                                if (position == Object.keys(beatmap_score).length) {
                                    if (Object.keys(beatmap_score).length >= 100) {
                                        rank_now.innerHTML = '#??';
                                    } else {
                                        rank_now.innerHTML = '#' + Object.keys(beatmap_score).length;
                                    }
                                    temp = false;
                                    break;
                                } else {
                                    if (expected_temp <= beatmap_score[position].score) {
                                        let rank_down_box = document.getElementById(`rank_${position}`);
                                        let rank_down_box_number = document.getElementById(`rank_number_${position}`);
                                        rank_down_box.style.top = ((position) * 88) + 'px';
                                        rank_box_now.style.top = ((position + 1) * 88) + 'px';
                                        position = position + 1;
                                        rank_now.innerHTML = '#' + (position + 1);
                                        rank_down_box_number.innerHTML = '#' + (position);


                                        if (Object.keys(beatmap_score).length <= 4) {
                                            rank_container.style.top = '0px';
                                        } else if (position == 0 || position == 1 || position == 2) {
                                            rank_container.style.top = '0px';
                                        } else if (position == Object.keys(beatmap_score).length || position == (Object.keys(beatmap_score).length - 1) || position == (Object.keys(beatmap_score).length) - 2) {
                                            rank_container.style.top = (0 - (Object.keys(beatmap_score).length - 7) * 88) + 'px';
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
                } else if (rankedStatus == RANKED_STATUS_PENDING || ranked_check == RANKED_STATUS_PENDING) {
                    while (temp == true) {
                        if (position == 0) {
                            // 포지션이 최상단 일 떄
                            if (expected_temp <= slots[position].score) {
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
                            if (expected_temp > slots[position - 1].score) {
                                let rank_up_box = document.getElementById(`rank_${position - 1}`);
                                let rank_up_box_number = document.getElementById(`rank_number_${position - 1}`);
                                rank_up_box.style.top = (position * 88) + 'px';
                                rank_box_now.style.top = ((position - 1) * 88) + 'px';
                                position = position - 1;
                                rank_now.innerHTML = '#' + (position + 1);
                                rank_up_box_number.innerHTML = '#' + (position + 2);

                                if (slots.length - 1 <= 4) {
                                    rank_container.style.top = '0px';
                                } else if (position == 0 || position == 1 || position == 2) {
                                    rank_container.style.top = '0px';
                                } else if (position == slots.length - 1 || position == (slots.length - 2) || position == (slots.length - 3)) {
                                    rank_container.style.top = ((0 - (slots.length - 8)) * 88) + 'px';
                                } else {
                                    rank_container.style.top = (0 - (position - 2) * 88) + 'px';
                                }
                            } else {
                                if (position == slots.length - 1) {
                                    if (slots.length - 1 >= 100) {
                                        rank_now.innerHTML = '#Out';
                                    } else {
                                        rank_now.innerHTML = '#' + (slots.length);
                                    }
                                    temp = false;
                                    break;
                                } else {
                                    if (expected_temp <= slots[position].score) {
                                        let rank_down_box = document.getElementById(`rank_${position}`);
                                        let rank_down_box_number = document.getElementById(`rank_number_${position}`);
                                        rank_down_box.style.top = ((position) * 88) + 'px';
                                        rank_box_now.style.top = ((position + 1) * 88) + 'px';
                                        position = position + 1;
                                        rank_now.innerHTML = '#' + (position + 1);
                                        rank_down_box_number.innerHTML = '#' + (position);

                                        if (slots.length - 1 <= 4) {
                                            rank_container.style.top = '0px';
                                        } else if (position == 0 || position == 1 || position == 2) {
                                            rank_container.style.top = '0px';
                                        } else if (position == slots.length - 1 || position == (slots.length - 2) || position == (slots.length - 3)) {
                                            rank_container.style.top = ((0 - (slots.length - 8)) * 88) + 'px';
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
            }
        }
    } catch (err) {
        console.log(err);
    };
}, FILTERS_V2);
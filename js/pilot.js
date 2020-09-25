var app = new Vue({
    el: "#fgPilot",
    data: {
        loaded: false,
        now_index: "pilot",
        search_input: "",
        open_view: false,
        loading_pilot: false,
        selected_pilot: undefined,
        selected_skin_id: 0,
        selected_skin: undefined,
        skin_loading: false,
        selected_star: 0,
        max_star: 0,
        talent_list: undefined,
        marry_status: undefined,
        selected_level: -1,
        pilot_level_data: undefined,
        pilot_star_data: undefined,
        lp_lst: [],
        max_lp: 0,
        mcv_default_skill: undefined,
        mcv_nature_data: undefined,
        mcv_nature_level: 1,

        skill_level: [],
        selected_pilot_skill_array: [],
        unpacker_mode: false,

        pixi: undefined,
        mouse: false,
        last_mouse_x: 0,
        last_mouse_y: 0,
        spine: undefined,
        spine_switch: true,
        now_scale: 0.5,
        spine_loaded: false,

        property_color: {
            "2": "#427F00",
            "6": "#B40000",
            "10": "#2249CE",
            "14": "#791D88",
            "18": "#A17F00",
        },
        now_nature: undefined,
        nature: undefined,
    },
    watch: {
        now_scale: {
            handler: function (val, old) {
                if (this.spine) {
                    this.spine.scale.set(val);
                }
            },
            immediate: true,
        },
        unpacker_mode: {
            handler: function (val, old) {
                if (this.selected_skin) {
                    let p = this.selected_pilot_skill_array.length;
                    this.selected_pilot_skill_array = this.get_skill_array();
                    if (this.selected_pilot_skill_array.length - p > 0) {
                        for (let i = 0; i < this.selected_pilot_skill_array.length - p; i++) {
                            this.skill_level.push(1);
                        }
                    }
                }
            },
            immediate: true,
        },
        selected_level: {
            handler: function (val, old) {
                if (this.pilot_level_data) {
                    let p2 = parseInt(val);
                    if (val == "") {
                        this.selected_level = 1;
                    }
                    if (p2 > this.pilot_level_data.length || p2 <= 0) {
                        this.selected_level = parseInt(old);
                    }
                    this.reset_lp_lst();
                }
            },
            immediate: true,
        },
        selected_star: {
            handler: function (val, old) {
                if (this.pilot_star_data) {
                    this.pilot_star_data = fg_data.GirlStarData.find((x) => x.GirlId == this.selected_pilot.ID && x.GirlStar == val);
                    this.reset_lp_lst();
                }
            },
            immediate: true,
        },
    },
    mounted() {
        init_data();
        let self = this;
        window.onresize = function () {
            self.$forceUpdate();
            self.reset_pixi_view(self.pixi);
        };
        this.pixi = new PIXI.Application({ width: 1920, height: 1080, transparent: true });
    },
    methods: {
        reset_pixi_view(pixi) {
            let p = window.innerWidth > 1000 ? 1000 : window.innerWidth;
            pixi.view.style.width = p + "px";
            pixi.view.style.height = (p * 9) / 16 + "px";
        },
        handle_select: handle_select_url,
        create_pilot_filter(str) {
            let c2 = fg_data.GirlData.filter((fg_girl) => {
                return fg_data.LanguageData[fg_girl.Name].indexOf(str) != -1 || fg_girl.EnglishName.toLowerCase().indexOf(str.toLowerCase()) != -1;
            });
            let rst = [];
            c2.forEach((x) => {
                if (x.ID > 7000) return;
                rst.push({ value: fg_data.LanguageData[x.Name], pilot: x });
            });
            return rst;
        },
        query_pilot(str, cb) {
            cb(str ? this.create_pilot_filter(str) : []);
        },
        pilot_handle_select(obj) {
            this.load_pilot_data(obj.pilot, 1);
        },
        read_real_texture_size(raw_atlas) {
            let r = /size: ([0-9]+),([0-9]+)/g.exec(raw_atlas);
            return [parseInt(r[1]), parseInt(r[2])];
        },
        get_skin_icon(girl_id, skin_id) {
            let p = fg_data.GirlSkinData.find((x) => x.GirlId == girl_id && x.Skin == skin_id).HeadIcon;
            return "assets/icon/head/" + p + ".png";
        },
        get_skin_list(girl_id) {
            return fg_data.GirlSkinData.filter((x) => x.GirlId == girl_id);
        },
        get_skin_square_head() {
            return "assets/icon/square/" + this.selected_skin.HeadIcon_square + ".png";
        },
        load_pilot_data(pilot, skin_id) {
            this.skin_loading = true;
            this.open_view = false;
            this.selected_pilot = pilot;
            this.selected_skin_id = skin_id;
            this.selected_skin = fg_data.GirlSkinData.find((x) => x.GirlId == pilot.ID && x.Skin == skin_id);
            this.selected_star = pilot.BasicStarLevel;
            this.max_star = fg_data.GirlStarData.filter((x) => x.GirlId == pilot.ID).length;
            this.selected_pilot_skill_array = this.get_skill_array();
            this.skill_level = [];
            this.talent_list = this.get_talent_list();
            this.marry_status = this.get_marry_status();
            this.selected_level = 60;
            this.pilot_level_data = fg_data.GirlLevelData.filter((x) => x.GirlId == pilot.ID);
            this.pilot_star_data = fg_data.GirlStarData.find((x) => x.GirlId == pilot.ID && x.GirlStar == this.selected_star);
            this.reset_lp_lst();
            this.mcv_default_skill = this.get_mcv_default_skill();
            this.mcv_nature_data = this.get_mcv_nature_data();
            this.nature = this.calc_nature_table();
            this.mcv_nature_level = 1;
            if (this.nature.length > 0) {
                this.now_nature = this.nature[0];
            }
            for (let i in this.selected_pilot_skill_array) {
                this.skill_level.push(1);
            }
            this.$forceUpdate();
            let b = document.querySelector("#spine");
            if (!this.spine_loaded) {
                b.appendChild(this.pixi.view);
            }
            let self = this;
            let app = this.pixi;
            let skin = fg_data.GirlSkinData.find((x) => x.Skin == skin_id && x.GirlId == pilot.ID);
            axios.get("assets/spine/" + skin.Cartoon + "/spine.json").then((resp) => {
                this.pixi.loader
                    .add("spine", "assets/spine/" + skin.Cartoon + "/" + resp.data.skel, { xhrType: "arraybuffer" })
                    .add("atlas", "assets/spine/" + skin.Cartoon + "/" + resp.data.atlas, { type: "atlas" })
                    .add("tex", "assets/spine/" + skin.Cartoon + "/" + resp.data.texture + ".png")
                    .load(function (loader, res) {
                        let p = new SkeletonBinary();
                        p.data = new Uint8Array(res["spine"].data);
                        p.initJson();
                        let rawAtlasData = res["atlas"].data;
                        let spineAtlas = new PIXI.spine.core.TextureAtlas(rawAtlasData, function (line, callback) {
                            let tex = PIXI.BaseTexture.from("tex");
                            let size = self.read_real_texture_size(rawAtlasData);
                            tex.width = size[0];
                            tex.height = size[1];
                            callback(tex);
                        });
                        let spineAtlasLoader = new PIXI.spine.core.AtlasAttachmentLoader(spineAtlas);
                        let spineJsonParser = new PIXI.spine.core.SkeletonJson(spineAtlasLoader);
                        let skeletonData = spineJsonParser.readSkeletonData(p.json);
                        let spine = new PIXI.spine.Spine(skeletonData);
                        self.spine = spine;
                        let animations = spine.spineData.animations;

                        spine.state.addAnimation(0, "idle", true);
                        let h = parseInt(spine.height * self.now_scale);
                        spine.position.set(1000, h);
                        for (let i = 0; i < app.stage.children.length; i++) {
                            app.stage.removeChild(app.stage.children[i]);
                        }
                        app.stage.addChild(spine);
                        self.last_mouse_x = 0;
                        self.last_mouse_y = 0;
                        if (!self.spine_loaded) {
                            $(app.view).mousedown(() => {
                                self.mouse = true;
                                self.last_mouse_x = event.clientX - event.target.getBoundingClientRect().left;
                                self.last_mouse_y = event.clientY - event.target.getBoundingClientRect().top;
                            });
                            $(app.view).mouseup(() => {
                                self.mouse = false;
                            });
                            $(app.view).mousemove((event) => {
                                let sx = event.clientX - event.target.getBoundingClientRect().left;
                                let sy = event.clientY - event.target.getBoundingClientRect().top;
                                if (self.mouse) {
                                    self.spine.position.set(sx - self.last_mouse_x + self.spine.position._x, sy - self.last_mouse_y + self.spine.position._y);
                                    self.last_mouse_x = sx;
                                    self.last_mouse_y = sy;
                                }
                            });
                            $(app.view).mouseout(() => {
                                self.mouse = false;
                            });
                            $(app.view).on("touchstart", (event) => {
                                self.mouse = true;
                                self.last_mouse_x = event.touches[0].clientX - event.target.getBoundingClientRect().left;
                                self.last_mouse_y = event.touches[0].clientY - event.target.getBoundingClientRect().top;
                            });
                            $(app.view).on("touchend", (event) => {
                                self.mouse = false;
                            });
                            $(app.view).on("touchmove", (event) => {
                                let sx = event.touches[0].clientX - event.target.getBoundingClientRect().left;
                                let sy = event.touches[0].clientY - event.target.getBoundingClientRect().top;
                                if (self.mouse) {
                                    self.spine.position.set(sx - self.last_mouse_x + self.spine.position._x, sy - self.last_mouse_y + self.spine.position._y);
                                    self.last_mouse_x = sx;
                                    self.last_mouse_y = sy;
                                }
                            });
                            app.start();
                        }
                        self.reset_pixi_view(self.pixi);
                        self.spine.scale.set(self.now_scale);
                        self.skin_loading = false;
                        self.spine_loaded = true;
                        self.pixi.loader.reset();
                    });
            });
        },
        get_pilot_list() {
            return fg_data.GirlData.filter((fg_girl) => fg_girl.ID < 7000);
        },
        calc_language(id) {
            return fg_data.LanguageData[id];
        },
        get_default_head_icon(id) {
            return "assets/icon/head/" + fg_data.GirlSkinData.find((x) => x.ID == id).HeadIcon + ".png";
        },
        get_skin_name() {
            return this.calc_language(this.selected_skin.SkinName);
        },
        check_width() {
            return window.innerWidth > 700;
        },
        get_rarity(girl_quality_type) {
            return "assets/rarity/" + girl_quality_type + ".png";
        },
        check_star_a(idx) {
            if (idx > this.selected_star) {
                return "el-icon-star-off";
            }
            return "el-icon-star-on";
        },
        set_star(star) {
            if (this.selected_star + star > 0 && this.selected_star + star <= this.max_star) {
                this.selected_star += star;
            }
        },
        get_next_star_item() {
            let b = fg_data.GirlStarData.find((x) => x.GirlStar == this.selected_star && x.GirlId == this.selected_pilot.ID);
            if (b == undefined) {
                return [];
            }
            return b.UpStarPieceCost;
        },
        get_icon(id) {
            return "assets/icon/item/" + fg_data.ItemData.find((x) => x.ID == id).Icon + ".png";
        },
        get_skill_array() {
            let arr = [];
            for (let skill in this.selected_skin.SkillArray) {
                let array_id = this.selected_skin.SkillArray[skill][0];
                let skill_array = fg_data.SkillArrayData.filter((x) => x.ArrayID == array_id);
                let skill_a = [];
                for (let sk in skill_array) {
                    skill_a.push(fg_data.TrunkSkillData.find((x) => x.ID == skill_array[sk].SkillID));
                }
                arr.push({
                    level: this.selected_skin.SkillArray[skill][1],
                    skills: skill_a,
                });
                if (skill == this.selected_skin.SkillArray.length - 1) {
                    skill_array = [];
                    if (this.unpacker_mode) {
                        array_id += 1;
                        skill_array = fg_data.SkillArrayData.filter((x) => x.ArrayID == array_id);
                    } else {
                        if (this.selected_skin.SkillArrayUR.length != 0) {
                            skill_array = fg_data.SkillArrayData.filter((x) => x.ArrayID == this.selected_skin.SkillArrayUR[0][0]);
                        } else {
                            skill_array = [];
                        }
                    }
                    if (skill_array.length != 0) {
                        skill_a = [];
                        for (let sk in skill_array) {
                            skill_a.push(fg_data.TrunkSkillData.find((x) => x.ID == skill_array[sk].SkillID));
                        }
                        arr.push({
                            level: 6,
                            skills: skill_a,
                        });
                    }
                }
            }
            return arr;
        },
        get_skill_icon(skill_icon_id) {
            return "assets/icon/skill/" + skill_icon_id + ".png";
        },
        set_skill_lv(idx, num) {
            let tmp = this.skill_level[idx];
            if (tmp + num > 0 && tmp + num <= this.selected_pilot_skill_array[idx].skills.length) {
                this.skill_level[idx] = tmp + num;
                this.$forceUpdate();
            }
        },
        get_talent_list() {
            let base_talent_id = fg_data.TalentSpecialData.find((x) => x.ID == this.selected_pilot.ID).SkillUp[0];
            let talent_array = [base_talent_id, base_talent_id + 1, base_talent_id + 2];
            let talent_skills = fg_data.TrunkSkillData.filter((x) => talent_array.indexOf(x.ID) != -1);
            return talent_skills;
        },
        get_marry_status() {
            let marry = this.selected_pilot.AffectionAttribute;
            let attr_lst = [];
            for (let idx in marry.keys) {
                let p = fg_data.PropertyData.find((x) => x.ID == marry.keys[idx]);
                let num = marry.values[idx];
                if (p.DateType == "float") {
                    num = Number(num * 100).toFixed(2) + "%";
                }
                attr_lst.push(p.Name + "+" + num);
            }
            return attr_lst;
        },
        set_selected_level(ps) {
            this.selected_level += parseInt(ps);
        },
        calc_property_name(id) {
            return fg_data.PropertyData.find((x) => x.ID == id).Name;
        },
        calc_property_v(id, ori) {
            let lv = this.pilot_level_data.find((x) => x.Level == this.selected_level);
            let p = lv.GirlProperty.keys.indexOf(lv.GirlProperty.keys.find((x) => x == id));
            let val = lv.GirlProperty.values[p];
            return ori + val;
        },
        reset_lp_lst() {
            this.lp_lst = [];
            let tmp = [];
            for (let i in this.pilot_star_data.GirlStarProperty.keys) {
                let b = this.calc_property_v(this.pilot_star_data.GirlStarProperty.keys[i], this.pilot_star_data.GirlStarProperty.values[i]);
                tmp.push(b);
                this.lp_lst.push({ key: this.pilot_star_data.GirlStarProperty.keys[i], value: b });
            }
            this.max_lp = Math.max.apply(null, tmp);
        },
        get_trunk_skill(skill_id) {
            return fg_data.TrunkSkillData.find((x) => x.ID == skill_id);
        },
        get_equip_sub_type(id) {
            return equip_sub_type[id];
        },
        get_profession(id) {
            return profession_type[id];
        },
        get_camp(id) {
            return camp[id];
        },
        get_kindness_gift() {
            let p = [];
            for (let i in this.selected_pilot.FavoriteArticles) {
                p.push(kindness_gift[this.selected_pilot.FavoriteArticles[i]]);
            }
            return p.join("、");
        },
        get_mcv_default_skill() {
            return fg_data.MCVGirlSkillData.find((x) => x.ID == this.selected_pilot.DefaultSkill);
        },
        get_mcv_nature_data() {
            return fg_data.MCVNatureIdData.find((x) => x.ID == this.selected_pilot.MainNature);
        },
        calc_nature_table() {
            let tmp_nature = [];
            let nature_lst = [];
            let ftmp = fg_data.MCVNatureData.filter((x) => x.GirlID == this.selected_pilot.ID);
            for (let i in ftmp) {
                nature_lst.push(ftmp[i].NatureID);
            }
            for (let i in nature_lst) {
                let pp = fg_data.MCVNatureIdData.find((x) => x.ID == nature_lst[i]);
                let name = this.calc_language(pp.Desc);
                let parr = [];
                ftmp = fg_data.MCVNatureUnlockSkillData.filter((x) => x.NatureID == nature_lst[i] && x.GirlID == this.selected_pilot.ID);
                for (let i in ftmp) {
                    parr.push(fg_data.MCVGirlSkillData.find((x) => x.ID == ftmp[i].SkillID));
                }
                tmp_nature.push({
                    key: name,
                    value: parr,
                    color: pp.Color,
                });
            }
            return tmp_nature;
        },
        set_mcv_skill_lv(lv) {
            let l = parseInt(lv);
            if (this.mcv_nature_level + l > 0 && this.mcv_nature_level + l <= this.now_nature.value.length) {
                this.mcv_nature_level += l;
            }
        },
        start_spine() {},
    },
});

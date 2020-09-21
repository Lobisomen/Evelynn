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

        skill_level: [],
        selected_pilot_skill_array: [],

        pixi: undefined,
        mouse: false,
        last_mouse_x: 0,
        last_mouse_y: 0,
        spine: undefined,
        spine_switch: true,
        now_scale: 0.5,
        spine_loaded: false,
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
            return "assets/rarity/" + rarity[girl_quality_type];
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
            let b = fg_data.GirlStarData.find((x) => x.GirlId == this.selected_pilot.ID && x.GirlStar == this.selected_star);
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
                    array_id += 1;
                    skill_array = fg_data.SkillArrayData.filter((x) => x.ArrayID == array_id);
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
        start_spine() {},
    },
});

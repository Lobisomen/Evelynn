var lang = 'sc' //I18N
var data_lst_keys = 
[
	'TrunkSkillData',
	'GirlData',
	'GirlSkinData',
	'GirlStarData',
	'ItemData',
	'SkillArrayData',
	'LanguageData',
	'StoryJsonDatas'
]
var fg_data = {}
async function load_basic_data(file_name)
{
	await axios.get('fg_data/' + lang + '/' + file_name + '.json').then((resp) =>
	{
		fg_data[file_name] = resp.data
	})
}
async function init_data()
{
	if (localStorage.hasOwnProperty('lang'))
		lang = localStorage.getItem('lang')
	else
		localStorage.setItem('lang', 'sc')
	await axios.all(data_lst_keys.map(load_basic_data)).then(axios.spread((...a) =>
	{
		Vue.set(app.$data, 'loaded', true)
	}))
}
function handle_select_url(key, key_path)
{
	if (key == app.$data.now_index)
		return
	switch (key)
	{
		case 'mainpage':
			window.location = './index.html'
			break
		case 'pilot':
			window.location = './pilot.html'
			break
	}
}

var rarity = 
[
	'N.png',
	'R.png',
	'SR.png',
	'SSR.png',
	'',
	'UR.png'
]
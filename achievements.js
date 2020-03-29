class Achievement {
  static colors = {
    0 : '#444444b0',
    1 : '#ffffffb0',
    2 : '#399c4cb0',
    3 : '#001bb9b0',
    4 : '#700298b0',
    5 : '#cf7800b0',
    6 : '#b90000b0',
    7 : '#00ffecb0'
  };

  static description_color = '#ffdb98';
  static locked_description_color = '#f18c8c';

  static alternative_colors = {
    0 : '#929292',
    1 : '#ffffff',
    2 : '#399c4c',
    3 : '#8698ff', //
    4 : '#b700f9', //
    5 : '#cf7800',
    6 : '#b90000',
    7 : '#00ffec' 
  }

  static percentiles = {
    6 : 0,
    26 : 1,
    51 : 2,
    66 : 3,
    76 : 4,
    86 : 5,
    99 : 6,
    101 : 7
  }

  constructor(title) {
    this.title = title;
  }

  get locked_description() {
    return 'Достижение заблокировано.';
  }
}

class Skill extends Achievement {
  constructor(title) {
    super(title);
    this.level = 0;
    this.hidden = true;
    this.subtitle = 'Бесславный';
    this.conditions = Skill.conditions;
    this.subtitles = Skill.subtitles;
    this.url_prefix = Skill.url_prefixes[title];
  }

  static subtitles = {
    'Пользователь' : 1,
    'Опытный' : 2,
    'Эксперт' : 3,
    'Мастер' : 4,
    'Сэнсей' : 5
  };

  static conditions = {
    1 : {level : 2, reward : 10, accumulated_reward : 10},
    2 : {level : 5, reward : 25, accumulated_reward : 35},
    3 : {level : 10, reward : 50, accumulated_reward : 85},
    4 : {level : 15, reward : 100, accumulated_reward : 185},
    5 : {level : 20, reward : 200, accumulated_reward : 385},
  };

  static url_prefixes = {
    'Навык кулачного боя' : 'Fists',
    'Огнестрельное оружие' : 'Firearm',
    'Холодное оружие' : 'Cold',
    'Метательное оружие' : 'Throwable',
    'Колющее оружие' : 'Piercing',
    'Взрывчатое оружие' : 'Explosive',
    'Высокотехнологическое оружие' : 'Hitech',
    'Владение блатными подвязками' : 'Criminal',
    'Биологическое оружие' : 'Biological',
    'Энергетическое оружие' : 'Energy',
    'Ментальное оружие' : 'Mental',
    'Контактный бой' : 'Contact',
    'Медицина' : 'Medicine',
    'Навык божественной силы' : 'Holy'
  };

  handleSubtitle(subtitle) {
    const suitable = hasOwnProperty.call(this.subtitles, subtitle);
    if (suitable && this.subtitles[subtitle] > this.level) {
      this.level = this.subtitles[subtitle];
      this.hidden = false;
      this.subtitle = subtitle;
    }

    return suitable;
  }

  setupTooltip(tooltip) {
    tooltip.setTitle(this.title, this.subtitle, this.alt_color);
    if (this.hidden) {
      tooltip.setLocked();
      tooltip.setDescription(this.locked_description, Achievement.locked_description_color);
      tooltip.show();
    } else {
      tooltip.restoreMargin();
      tooltip.setLevel(this.level);
      tooltip.setPoints(this.reward, this.accumulated_reward);
      tooltip.setDescription(this.description, Achievement.description_color);
      tooltip.show();
    }
  }

  get description() {
    return `Выдаётся за достижение ${Skill.conditions[this.level].level}-го уровня боевого навыка "${this.title}".`;
  }

  get reward() {
    return this.conditions[this.level].reward;
  }

  get accumulated_reward() {
    return this.conditions[this.level].accumulated_reward;
  }

  get progress() {
    return this.level;
  }

  get max_progress() {
    return Object.keys(this.conditions).length;
  }

  get max_reward() {
    return this.conditions[this.max_progress].accumulated_reward;
  }

  get src() {
    return `${BRP.ASSETS_URL}/${this.url_prefix}/${this.hidden ? 1 : this.level}.png`;
  }

  get color() {
    return Achievement.colors[this.level];
  }

  get alt_color() {
    return Achievement.alternative_colors[this.level];
  }
}

class ExtraSkill extends Skill {
  static url_prefixes = {
    'Сбор бутылок' : 'Bottles',
    'Сбор котов' : 'Cats',

    'Карма' : 'Karma',
    'Социальность' : 'Referals',
    'Донат' : 'Donation',
  };

  constructor(title, subtitles, description, conditions) {
    super(title);
    this.subtitles = subtitles;
    Object.defineProperty(this, 'description', { get: description });
    this.conditions = conditions;
    this.url_prefix = ExtraSkill.url_prefixes[title];
  }

  get count() {
    return this.conditions[this.level].count;
  }
}

class Collectable extends Achievement {
  constructor(title, subtitle='') {
    super(title, subtitle);
  }
}

class DailyAchievement extends Achievement {
  static urls = {
    'Фармер дня' : '2.png',
    'Качок дня' : '1.png'
  }

  constructor(title) {
    super(title);
    this.hidden = true;
    this.url_prefix = 'Daily';
    this.url = DailyAchievement.urls[title];
    this.rarity = 3;
    this.conditions = {
      3 : {reward : 200, accumulated_reward : 200}
    }
  }

  setupTooltip(tooltip) {
    tooltip.setTitle(this.title, '', this.alt_color);
    if (this.hidden) {
      tooltip.setLocked();
      tooltip.setDescription(this.locked_description, Achievement.locked_description_color);
      tooltip.show();
    } else {
      tooltip.setDaily();
      tooltip.setPoints(this.reward, this.accumulated_reward);
      tooltip.setDescription(this.description, Achievement.description_color);
      tooltip.show();
    }
  }

  get src() {
    return `${BRP.ASSETS_URL}/${this.url_prefix}/${this.url}`;
  }

  get reward() {
    return this.conditions[this.rarity].reward
  }

  get accumulated_reward() {
    return this.conditions[this.rarity].accumulated_reward;
  }

  get max_reward() {
    return this.conditions[this.rarity].accumulated_reward;
  }
  
  get progress() {
    return this.hidden ? 0 : 1;
  }

  get max_progress() {
    return 1;
  }

  get color() {
    return Achievement.colors[this.hidden ? 0 : this.rarity];
  }

  get alt_color() {
    return Achievement.alternative_colors[this.hidden ? 0 : this.rarity];
  }

  get description() {
    return `Выдаётся за единократное получение достижения '${this.title}'.`
  }
}

  // ==UserScript==
  // @name         Better Rupark
  // @namespace    http://tampermonkey.net/
  // @version      0.8.2
  // @description  RP forum extensions
  // @author       Wiblz
  // @include      http*://rupark.com/*
  // @exclude      http*://rupark.com/game*

  // @updateURL    https://github.com/Wiblz/Better-RP/raw/master/BRP.user.js
  // @grant        GM_setValue
  // @grant        GM_getValue
  // @grant        GM_listValues
  // @grant        GM_deleteValue

  // @require      https://code.jquery.com/jquery-3.4.1.min.js
  // @require      https://github.com/Wiblz/Better-RP/raw/master/blacklist.js
  // @require      https://github.com/Wiblz/Better-RP/raw/master/achievements.js
  // @require      https://github.com/Wiblz/Better-RP/raw/master/tooltip.js
  // ==/UserScript==

  function has(object, key) {
    return object ? hasOwnProperty.call(object, key) : false;
  }

  String.prototype.hashCode = function() {
    let hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };

  /* Global module object */
  const BRP = (function() {
    'use strict';

    const BRP = {};

    BRP.VERSION_STRING = 'v0.8.2';
    BRP.WHATS_NEW_URL = 'https://rupark.com/topic1217340/';
    BRP.ASSETS_URL = 'https://raw.githubusercontent.com/Wiblz/Better-RP/master/assets';
    BRP.VERSION_COLOR = '#b90000';
    BRP.DEBUG_MODE = false;

    BRP.GREEN = '#0ed217';
    BRP.RED = '#8a2424';
    BRP.CURRENT_YEAR = '2020';

    BRP.paginationEnabled = false;

    BRP.User = {};

    BRP.User.nickname = null;
    BRP.User.banned = false;
    BRP.User.logged_out = false;

    BRP.User.detectUser = function() {
      this.nickname = $('.personal .fn.nickname.url b').text();
      if (this.nickname === "") {
        this.logged_out = true;
        return;
      }
      this.nicknameHash = this.nickname.hashCode();

      if (banned.has(this.nicknameHash)) {
        GM_setValue('banned', '1');
      }

      this.banned = GM_getValue('banned') != null;
    }

    BRP.Dates = {};

    BRP.Dates.convertMonth = {
      'января': 'Jan',
      'февраля': 'Feb',
      'марта': 'Mar',
      'апреля': 'Apr',
      'мая': 'May',
      'июня': 'Jun',
      'августа': 'Aug',
      'сентября': 'Sep',
      'октября': 'Oct',
      'ноября': 'Nov',
      'декабря': 'Dec'
    }

    BRP.Dates.parseDate = function(str) {
      let parts = str.replace(/,/g, '').split(' ');

      // "сегодня", "вчера" or something else indefinite
      if (isNaN(parts[0])) {
        return new Date();
      }

      parts[1] = this.convertMonth[parts[1]];
      if (isNaN(parts[2])) {
        parts.push(parts[2]);
        parts[2] = BRP.CURRENT_YEAR;
      }

      return new Date(parts.join(' '));
    }


    BRP.Ignore = {};

    BRP.Ignore.ignoredUsers = GM_listValues().filter(str => str.startsWith('ignore_'))
                                            .map(str => str.substring(7));

    BRP.Ignore.addIgnoreButton = function(nickname) {
      let $userInfo = $('.inputform-m');

      if ($userInfo.length == 0) {
        return;
      }

      let ignoreButton = $(document.createElement('a')).addClass('button')
                                                      .css({ cursor : 'pointer' });

      if (GM_getValue('ignore_' + nickname, null) != null) {
        ignoreButton.text('Убрать из игнора')
                    .addClass('unignore');
      } else {
        ignoreButton.text('Добавить в игнор');
      }

      ignoreButton.appendTo($('tr:last>:first-child', $userInfo));

      ignoreButton.click(function() {
        if (ignoreButton.hasClass('unignore')) {
          GM_deleteValue('ignore_' + nickname);
          BRP.Ignore.ignoredUsers = BRP.Ignore.ignoredUsers.filter(e => e !== nickname);
          ignoreButton.text('Добавить в игнор');
        } else {
          GM_setValue('ignore_' + nickname, 0);
          BRP.Ignore.ignoredUsers.push(nickname);
          ignoreButton.text('Убрать из игнора');
        }

        ignoreButton.toggleClass('unignore');
      });
    }

    BRP.Ignore.unignore = function(button) {
      let row = button.parent().parent();
      let nickname = row.find('.userNickname').first().text();

      GM_deleteValue('ignore_' + nickname);
      this.ignoredUsers = this.ignoredUsers.filter(e => e !== nickname);
      row.remove();

      $('.tabbar>').last().text(this.getIgnoreTabText());
    }

    BRP.Ignore.getIgnoreTabText = function() {
      if (this.ignoredUsers.length != 0) {
        return 'Игнор (' + this.ignoredUsers.length + ')';
      } else {
        return 'Игнор';
      }
    }

    BRP.Ignore.addIgnoredUsersTab = function() {
      let $tabs = $('.tabbar')

      let ignoredUsersTab = $(document.createElement('a')).addClass('rounded7')
                                                          .attr({ href : '#' })
                                                          .text(this.getIgnoreTabText())
                                                          .appendTo($tabs);

      ignoredUsersTab.click(() => {
        if (ignoredUsersTab.hasClass('active')) {
          return;
        }

        $tabs.siblings()
            .hide();

        $tabs.find('.active')
            .toggleClass('active');
        ignoredUsersTab.addClass('active');

        let $table = $(document.createElement('table')).addClass('grid')
                                                      .appendTo($tabs.parent());
        let $tbody = $(document.createElement('tbody')).appendTo($table);

        for (let user of this.ignoredUsers) {
          let $row = $(document.createElement('tr')).css('background', BRP.RED)
                                                    .html('<td><h4 style="margin-top: 0.4em"><a href="rupark.com/user/' + user + '" class="userNickname" style="margin-left:20px">' + user + '</a></h4></td>')
                                                    .appendTo($tbody);

          let $buttonColumn = $(document.createElement('td')).css('width', '10px')
                                                            .appendTo($row);
          let $unignoreButton = $(document.createElement('a')).addClass('button block')
                                                              .text('Убрать из игнора')
                                                              .css('cursor', 'pointer')
                                                              .click(function() {
                                                                BRP.Ignore.unignore($(this));
                                                              })
                                                              .appendTo($buttonColumn);
        }
      });
    }

    BRP.ImageResize = {
      hovered: false,
      pressed: false,
      dragged: false,
      distance: 0,

      initialX: 0,
      initialY: 0,

      multiplier: 1.0,
      dragged: 0,
      width: 0,
      height: 0,

      setListeners: function() {
        let $images = $('.txt').find('img');
        // let $images = $('.txt.content').find('img');

        let $win = $(window);

        let $container = $(document.createElement('div')).css({
            'position' : 'fixed',
            'display' : 'block',
            'background' : 'rgb(85, 85, 85)',
            'padding' : '8px',
            'z-index' : '1001'
          }).addClass('fullscreen-container')
            .mouseover(() => {
              this.hovered = true;
          }).mouseout(() => {
              this.hovered = false;
          }).mousedown((e) => {
            if (this.hovered) {
              this.initialX = e.clientX;
              this.initialY = e.clientY;

              this.dragged = true;
              this.distance = 0;

              e.preventDefault();
            }
          }).mouseup(() => {
              if (this.distance <= 3) {
                $container.hide();
                $container.html('');
                this.multiplier = 1.0;
              }

              this.dragged = false;
          }).appendTo('body')
            .hide();

        $images.css('cursor', 'pointer')
              .click(function(e) {
                $container.css({
                  'width' : this.width,
                  'height' : this.height,
                  'left' : ((window.innerWidth - this.width) / 2),
                  'top' : ((window.innerHeight - this.height) / 2)
                }).show();

                BRP.ImageResize.width = this.width
                BRP.ImageResize.height = this.height

                $(document.createElement('img')).attr('src', this.src)
                                                .css({
                                                  'width' : '100%',
                                                  'height' : '100%'
                                                })
                                                .appendTo($container);

                e.preventDefault();
        });

        $container[0].addEventListener('wheel', (e) => {
          if (this.hovered) {
            let x_ratio = (e.clientX - parseFloat($container[0].style.left)) / this.width / this.multiplier
            let y_ratio = (e.clientY - parseFloat($container[0].style.top)) / this.height / this.multiplier

            if (e.deltaY > 0 && this.multiplier > 0.4) {
              this.multiplier -= 0.3;
            } else if (e.deltaY < 0 && this.multiplier < 10.0) {
              this.multiplier += 0.3;
            }

            $container.css({
              'width' : this.width * this.multiplier,
              'height' : this.height * this.multiplier,

              'left' : e.clientX - x_ratio * this.width * this.multiplier,
              'top' : e.clientY - y_ratio * this.height * this.multiplier
            });

            e.preventDefault();
          }
        });

        $win.mousemove((e) => {
          if (this.dragged) {
            let deltaX = e.clientX - this.initialX;
            let deltaY = e.clientY - this.initialY;

            this.distance += (Math.abs(deltaX) + Math.abs(deltaY));

            this.initialX = e.clientX;
            this.initialY = e.clientY;

            let el_top = parseInt($container.css('top'));
            let el_left = parseInt($container.css('left'));

            $container.css({
                top: (el_top + deltaY) + 'px',
                left: (el_left + deltaX) + 'px'
            });
          }
        });

        $win.mousedown(() => {
          if (!BRP.ImageResize.hovered) {
            $container.hide();
            $container.html('');
            this.multiplier = 1.0;
          }
        });
      }
    }

    return BRP;
  }());

  $(() => {
    function randomColor() {
      return '#'+((1<<24)*Math.random()|0).toString(16);
    }

    function isURL(str) {
      return window.location.pathname.startsWith(str);
    }

    function isPrizesPage() {
      return window.location.pathname.endsWith('/prizes/') ||
            window.location.pathname.endsWith('/prizes');
    }

    function wrapRelevantText() {
      $('.txt').each(function(_, node) {
        let nodes = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, null);
        let textNode;

        while (textNode = nodes.nextNode()) {
          let parent = textNode.parentNode;

          if (/\S/.test(textNode.nodeValue) && parent.nodeName == 'DIV') {
            let text = textNode.nodeValue;
            let spanWrapper = document.createElement('span');

            // trimming only text on presents tab
            if (isURL('/user/') && window.location.pathname.endsWith('/presents/')) {
              spanWrapper.innerText = text.trim();
            } else {
              spanWrapper.innerText = text;
            }
            spanWrapper.className = 'relevant-text';

            textNode.nodeValue = '';
            parent.insertBefore(spanWrapper, textNode);
          }
        }
      });
    }

    function modifyNavigationBar() {
      const $table = $('.mainmenu > ul');
      let button = $(document.createElement('li'));
      let currentVersionNode = $(document.createElement('li')).css({
        position : 'absolute',
        right : '10px'
      }).appendTo($table);

      $currentVersionLink = $(document.createElement('a')).css({
                                                            'font-weight' : 'bold',
                                                            'color' : BRP.VERSION_COLOR
                                                          }).appendTo(currentVersionNode);

      if (BRP.User.banned) {
        $currentVersionLink.text('СОСИ ХУЙ БЫДЛО')
                          .attr('href', '#');

        return;
      } else if (BRP.User.logged_out) {
        $currentVersionLink.text('Log in first')
                          .attr('href', '#');

        return;
      }

      // link to what's new topic
      $currentVersionLink.text('BRP ' + BRP.VERSION_STRING)
      .attr('href', BRP.WHATS_NEW_URL);

      // notification about new version
      if (GM_getValue('version') != BRP.VERSION_STRING) {
        $(document.createElement('span')).text('New!')
                                        .css({
                                            color : BRP.GREEN,
                                            'margin-right' : '7px',
                                            'font-size' : '12px'
                                          }).mouseover(function() {
                                            $(this).hide();
                                            GM_setValue('version', BRP.VERSION_STRING);
                                          }).prependTo(currentVersionNode);
      }

      if (BRP.DEBUG_MODE) {
        $(document.createElement('a')).text('Clear Data')
                                      .attr('href', '#')
                                      .css({
                                        'font-weight' : 'bold',
                                        'color' : BRP.VERSION_COLOR,
                                        'margin-right' : '10px',
                                        'margin-left'  : '10px'
                                      }).click(() => {
                                        for (let value of GM_listValues()) {
                                          GM_deleteValue(value);
                                        }

                                        console.log('Value list cleared.');
                                      }).appendTo(currentVersionNode);
      }

      if (window.location.pathname.startsWith('/all')) {
        button.html('<a href=\'/all/\' style= \'text-decoration: none\'><b>Все топики</b></a>');
      } else {
        button.html('<a href=\'/all/\'>Все топики</a>');
      }

      button.prependTo($table);
    }

    function addJumpToTopPanel() {
      let p = 0;
      let clicked = false;

      $panel =  $(document.createElement('span')).css({
                  width : '10%',
                  height : '100%',
                  display : 'block',
                  position : 'fixed',
                  top : 0,
                  right : 0,
                  background : '#222222',
                  'z-index' : '998',
                  'cursor' : 'pointer'
                }).click(function() {
                    s = p;
                    p = document.scrollingElement.scrollTop;
                    clicked = true;
                    scroll(0, s);
                    // $(this).hide();
                }).mouseover(function() {
                    $(this).css('background', '#4d4d4d');
                }).mouseout(function() {
                    $(this).css('background', '#222222');
                }).appendTo($('body'));

      if (document.scrollingElement.scrollTop == 0) {
        $panel.hide();
      }

      $(window).scroll(function() {
        if (clicked) {
          clicked = false;
        } else {
          p = 0;
          document.scrollingElement.scrollTop == 0 ? $panel.hide() : $panel.show();
        }
      })
    }

    function modifyNicknames() {
      $('.url.fn.nickname').each((_, nickname) => {
        if (nickname.innerText == 'Zefir4eG') {
          modifyNickname($(nickname), '#FFC0CB', 'https://image.flaticon.com/icons/png/128/862/862724.png');
        }

        if (nickname.innerText == 'Нейтральный Джим' ||
            nickname.innerText == 'микрочелик') {
          modifyNickname($(nickname), null, 'https://image.flaticon.com/icons/svg/138/138533.svg');
        }
      })
    }

    function handleComments() {
      let topicID = 'top' + window.location.pathname.slice(6, -1);
      let $comments = $('.ps.comment');
      let ignoreSequence = false;
      let ignoredOffset = 0;

      $comments.each(function(_, comment) {
        let $comment = $(comment);
        let author = $comment.find('.url.fn.nickname').first().attr('title');
        let offset = Number($comment.css('margin-left').slice(0, -2));

        if (ignoreSequence) {
          if (offset > ignoredOffset) {
            $comment.hide();
          } else {
            ignoreSequence = false;
          }
        } else if (BRP.Ignore.ignoredUsers.includes(author)) {
          $comment.hide();
          ignoreSequence = true;
          ignoredOffset = offset;
        }
      });

      $('.reply').click(function() {
        $btn = $(this);
        if (!$btn.hasClass('active')) {
          $btn.addClass('active');

          $('.addcomment input').click(function() {
            let trackedTopics = GM_listValues().filter(str => str.startsWith('top'));
            if (trackedTopics.includes(topicID)) {
              GM_setValue(topicID, GM_getValue(topicID) + 1);
            }
          })
        }
      });

      BRP.ImageResize.setListeners();
    }

    /**
     * Helper function for adding listeners on links to topic
     */
    function addLinkListeners(topicNode, numericId, commentCount) {
      topicNode.find('a').each(function(_, link) {
        if (link.href.match(numericId) != null) {
          $(link).click(() => {
            GM_setValue(topicNode.attr('id'), commentCount);
          });
        }
      })
    }

    function handleTopics() {
      let $topics = $('.ps.hentry.blogs');

      // Shift admin panels (if present) to make amount of new comments visiblw
      $('.admin-panel').css('margin-left', '30px');

      // Tracking comment numbers of topics up to week old.
      let importanceTreshold = new Date();
      importanceTreshold.setDate(importanceTreshold.getDate() - 7);

      $topics.each(function(_, topic) {
        let $topic = $(topic);
        let id = $topic.attr('id');
        let author = $topic.find('.url.fn.nickname').attr('title');
        let datePublished = BRP.Dates.parseDate($topic.find('.published.updated').text());
        let numericId = id.substring(3);

        let $entryInfoNode = $topic.find('.panel.entry-info');
        let commentCountStr = $entryInfoNode.children('a:last')[0].nextSibling.nodeValue;
        let commentCount = parseInt(commentCountStr.substring(2, commentCountStr.length - 1));

        let $entryTitleNode = $topic.find('.entry-title');
        let trackedTopics = GM_listValues().filter(str => str.startsWith('top'));

        if (trackedTopics.includes(id)) {
          if (datePublished < importanceTreshold) {
            GM_deleteValue(id);
          } else if (GM_getValue(id) < commentCount) {
            // Add amount of new comments
            $(document.createElement('b')).text('+' + (commentCount - GM_getValue(id)))
                                          .css({
                                            color : BRP.GREEN,
                                            'margin-left' : '4px',
                                            'font-size' : 'small'
                                          }).mouseover(function() {
                                            $(this).hide();
                                            GM_setValue(id, commentCount);
                                          }).insertBefore($entryInfoNode.children().last());

            addLinkListeners($(topic), numericId, commentCount);
          }
        } else if (datePublished > importanceTreshold) {
          if (author == BRP.User.nickname) {
            GM_setValue(id, commentCount);
          } else {
            $(document.createElement('b')).text('New!')
                                          .css({
                                            color : BRP.GREEN,
                                            'margin-left' : '7px',
                                            'font-size' : 'medium'
                                          }).mouseover(function() {
                                            $(this).hide()
                                            GM_setValue(id, commentCount); // save current amount of comments
                                          }).appendTo($entryTitleNode);
          }

            addLinkListeners($(topic), numericId, commentCount);
        }

        if (BRP.Ignore.ignoredUsers.includes(author)) {
          $topic.hide();
        }
      })
    }

    function modifyNickname(node, color, iconSrc) {
      $(document.createElement('img')).attr({
        src : iconSrc,
        width : '12px',
        height : 'auto'
      }).css({
        'margin-bottom' : '-1px',
        'margin-right'  : '5px'
      }).prependTo($(node))

      node.css('margin-left', '-73px');

      if (color != null) {
        node.css('color', color);
      }
    }

    function emotes(node) {
      node.innerHTML = node.innerHTML.replace(/(^|\s)pepega($|\s)/g, ' <img src="https://cdn.frankerfacez.com/emoticon/243789/1"> ');
      node.innerHTML = node.innerHTML.replace(/(^|\s)peepoClown($|\s)/g, ' <img src="https://cdn.frankerfacez.com/emoticon/318914/1"> ');
      node.innerHTML = node.innerHTML.replace(/(^|\s)zeroClown($|\s)/g, '<img src="https://i.postimg.cc/cJ5qkH4w/zero-Clown.png" width="32px">');
    }

    function words(node) {
      let words = node.innerHTML.split('.')
                            .map(sentence => sentence.split(',')
                                                    .map(words => words.split(' ')
                                                                        .map(word => has(specialWords, word.hashCode()) ? `<b style="color:${randomColor()}">${specialWords[word.hashCode()]}</b>` : word)
                                                                        .join(' '))
                                                    .join(','))
                            .join('.');

      node.innerHTML = words;
    }

    BRP.User.detectUser();
    modifyNavigationBar();

    if (!BRP.User.banned) {
      addJumpToTopPanel();
      modifyNicknames();

      wrapRelevantText();

      $('.relevant-text').each(function(_, node) {
        words(node);
        emotes(node);
      })

      const skills = {};
      const skill_titles = [
        'Навык кулачного боя',
        'Огнестрельное оружие',
        'Холодное оружие',
        'Метательное оружие',
        'Колющее оружие',
        'Взрывчатое оружие',
        'Высокотехнологическое оружие',
        'Владение блатными подвязками',
        'Биологическое оружие',
        'Энергетическое оружие',
        'Ментальное оружие',
        'Контактный бой',
        'Медицина',
        'Навык божественной силы'
      ]

      for (title of skill_titles) {
        skills[title] = new Skill(title);
      }

      const extra_skills = {
        'Сбор бутылок' : new ExtraSkill('Сбор бутылок', {
          'Находчивый' : 1,
          'Мусорщик' : 2,
          'Собутыльник' : 3,
          'Эколог' : 4,
          'Повелитель бутылок' : 5
        }, () => `Выдаётся за сбор ${extra_skills['Сбор бутылок'].count} бутылок на улицах рупарка.`,
        {
          1 : {count : 1, reward : 10, accumulated_reward : 10},
          2 : {count : 100, reward : 25, accumulated_reward : 35},
          3 : {count : 500, reward : 50, accumulated_reward : 85},
          4 : {count : 1000, reward : 100, accumulated_reward : 185},
          5 : {count : 5000, reward : 200, accumulated_reward : 385},
        }),

        'Сбор котов' : new ExtraSkill('Сбор котов', {
          'Пушистый друг' : 1,
          'Котолов' : 2,
          'Мартовский ужас' : 3,
          'Хозяин зоопарка' : 4,
          '???' : 5
        }, () => `Выдаётся за сбор ${extra_skills['Сбор котов'].count} котэ на улицах рупарка.`,
        {
          1 : {count : 1, reward : 10, accumulated_reward : 10},
          2 : {count : 50, reward : 25, accumulated_reward : 35},
          3 : {count : 250, reward : 50, accumulated_reward : 85},
          4 : {count : 500, reward : 100, accumulated_reward : 185},
          5 : {count : 2500, reward : 200, accumulated_reward : 385},
        }),

        'Карма' : new ExtraSkill('Карма', {
          'Читатель' : 1,
          'Книжный червь' : 2,
          'Эрудит' : 3,
          'Журналист' : 4, 
          'Писатель' : 5
        }, () => `Выдаётся за получение ${extra_skills['Карма'].count} кармы.`,
        {
          1 : {count : 1, reward : 10, accumulated_reward : 10},
          2 : {count : 5, reward : 25, accumulated_reward : 35},
          3 : {count : 10, reward : 50, accumulated_reward : 85},
          4 : {count : 25, reward : 100, accumulated_reward : 185},
          5 : {count : 50, reward : 200, accumulated_reward : 385},
        }),

        'Социальность' : new ExtraSkill('Социальность', {
          'Приятель' : 1, 
          'Свой в доску' : 2, 
          'Компанейский' : 3, 
          'Заводила' : 4, 
          'Агитатор' : 5, 
          'Зазывала' : 6,
          'Почётный житель' : 7 
        }, () => `Выдаётся за ${extra_skills['Социальность'].count} приглашенных друзей.`,
        {
          1 : {count : 5, reward : 25, accumulated_reward : 25},
          2 : {count : 25, reward : 50, accumulated_reward : 75},
          3 : {count : 50, reward : 100, accumulated_reward : 175},
          4 : {count : 100, reward : 200, accumulated_reward : 375},
          5 : {count : 500, reward : 250, accumulated_reward : 625},
          6 : {count : 1000, reward : 300, accumulated_reward : 925},
          7 : {count : 1500, reward : 500, accumulated_reward : 1425},
        }),

        // 'Донат' : new ExtraSkill('Донат', {
        //   'Малая доля' : 1,
        //   'При деньгах' : 2,
        //   'Деньги не вопрос' : 3,
        //   'Состоятельный клиент' : 4,
        //   'Рокфеллер' : 5
        // }, () => `Выдаётся за пополнение на ${extra_skills['Донат'].count} рублей.`,
        // {})
      }

      const daily_achievements = {
        'Фармер дня' : new DailyAchievement('Фармер дня'),
        'Качок дня' : new DailyAchievement('Качок дня')
      }

      const balaclavas = {
        url_prefix : 'Balaclavas',

        achievements : {
          'Новобранец' : {rarity : 1, count : 0, url: '1.png'},
          'Гроза хомячков' : {rarity : 2, count : 0, url: '2.png'},
          'Практик' : {rarity : 3, count : 0, url: '3.png'},
          'Хладнокровный убийца' : {rarity : 4, count : 0, url: '4.png'},
          'Ночной охотник' : {rarity : 5, count : 0, url: '5.png'},
          'Просто жЫвотное' : {rarity : 6, count : 0, url: '6.png'},
          'Кошмарный ужас' : {rarity : 7, count : 0, url: '7.png'}
        }
      }

      const sabers = {
        url_prefix : 'Sabers',

        achievements : {
          'Световой меч Мэйса Винду' : {rarity : 1, count : 0, url: '2.png'},
          'Световой меч Стражников' : {rarity : 1, count : 0, url: '3.png'},
          'Световой меч Ситха' : {rarity : 2, count : 0, url: '1.png'},
          'Световой меч МИБов' : {rarity : 2, count : 0, url: '5.png'},
          'Световой меч Консулов' : {rarity : 3, count : 0, url: '4.png'}
        }
      }

      const medals = {
        url_prefix : 'Medals',

        achievements : {
          'Бронзовая медаль за заслуги перед Русским Парком' : {rarity : 1, count : 0, url: '1.png'},
          'Серебряная медаль за заслуги перед Русским Парком' : {rarity : 2, count : 0, url: '2.png'},
          'Золотая медаль за заслуги перед Русским Парком' : {rarity : 3, count : 0, url: '3.png'},
        }

        //'Медаль Ветерана Русского Парка' : {rarity : 1, count : 0}
      }

      function generateGrid(columns, rows, options) {
        var options = options || {};
        var gap = options.gap || '10px';
        var dimension = options.dimension || '120px';
        var header = options.header || '';
        const $container = $(document.createElement('div'));

        const $heading = $(document.createElement('div')).text(header).css('margin-bottom', '10px').appendTo($container);
        const a = $(document.createElement('span')).appendTo($heading);
        $(document.createElement('div')).css({
          'display': 'grid',
          'grid-template-columns': 'repeat(' + columns + ', ' + dimension,
          'grid-template-rows': 'repeat(' + rows + ', ' + dimension,
          'grid-gap': gap,
          'margin-bottom': '2em'
        }).appendTo($container);

        return $container;
      }
      
      // TODO: REMOVE!
      function parseSkills() {
        let prizes = $('.grid tr').each(function() {
            const $this = $(this);
            let name = $this.find('h4').text();
            let parts = name.split(' - ');

            if (parts.length == 2) {
              let title = parts[0];
              let subtitle = parts[1];

              if (has(skills, title)) {
                skills[title].handleSubtitle(subtitle);
              } else if (has(extra_skills, title)) {
                extra_skills[title].handleSubtitle(subtitle);
              }

              $this.remove();
            } else if (has(daily_achievements, parts[0])) {
              daily_achievements[parts[0]].hidden = false;

              $this.remove();
            } else {
              Object.keys(extra_skills).forEach(function(title) {
                if (extra_skills[title].handleSubtitle(name)) {
                  $this.remove();
                }
              });
            }
        })
      }

      if (isURL('/user/')) {
        console.log('user page')
        let page_owner = $('.item.vcard.fn.nickname').first().text()

        if (page_owner == BRP.User.nickname) {
          BRP.Ignore.addIgnoredUsersTab();
        } else {
          BRP.Ignore.addIgnoreButton(page_owner);
        }

        if (isPrizesPage()) {
          // const $test_grid = generateGrid(3, 100, {gap: '10px', dimension: '300px'}).insertAfter($('.tabbar')).children(':last');
          const $skill_grid = generateGrid(5, 3).insertAfter($('.tabbar'));
          const $extras_grid = generateGrid(5, 1).insertAfter($skill_grid);
          const $daily_achievements_grid = generateGrid(2, 1).insertAfter($extras_grid);

          // const $medal_grid = generateGrid(3, 1).insertAfter($daily_achievements_grid);
          // const $balaclavas_grid = generateGrid(7, 1, {gap: '4px', dimension: '88px'}).insertAfter($medal_grid);
          // const $saber_grid = generateGrid(5, 1).insertAfter($balaclavas_grid);
          
          // let objs = $('.grid object').toArray();
          // for (let i = 0; i < 97; i++) {
          //   $container = $(document.createElement('div')).addClass('skill-container')
          //                                   .css({
          //                                     'border': '#00ffff 2.5px solid',
          //                                     'border-radius' : '4px'
          //                                   })
          //                                   .appendTo($test_grid);

          //                                   $(objs[i]).appendTo($container);
          // }

          // throw '';

          let $tooltip = $(document.createElement('div')).css({
            'position' : 'absolute',
            'display' : 'none',
            'left' : '0',
            'top' : '0',
            'padding' : '12px',
            'background' : 'rgba(68, 68, 68, 0.9)',
            'border' : '2px solid #9f9f9f'
          }).appendTo($(document.body));

          let $title_box = $(document.createElement('div')).css({
            'position' : 'relative'
          }).appendTo($tooltip);

          let $description_box = $(document.createElement('div')).css({
            'margin-top' : '1em',
            'width' : '250px'
          }).appendTo($tooltip);

          let $title = $(document.createElement('span')).appendTo($title_box);
          let $level = $(document.createElement('span')).css({
            'font-size' : 'small',
            'color' : 'white'
          }).appendTo($title_box);

          let $points = $(document.createElement('span')).css({
            'font-size' : '0.75em',
            'color' : 'wheat',
            'margin-left' : '10px'
          }).appendTo($title_box);

          let $amount = $(document.createElement('span')).appendTo($title_box);
          let $description = $(document.createElement('span')).css({
            'width' : '100px',
            'color' : '#ffdb98',
            'font-size' : '0.85em'
          }).appendTo($description_box);

          $(document.createElement('br')).insertAfter($title);
          tooltipContainer = new Tooltip($tooltip, $title, $level, $points, $description);

          function generateContainer(grid, achievement) {
            let timeout;
            let hovered_color = achievement.color.slice(0, -2);

            $container = $(document.createElement('div'))
            .css({
              'border': achievement.color + ' 2.5px solid',
              'border-radius' : '4px'
            })
            .mouseenter(function() {
              $(this).css('border', hovered_color + ' 2.5px solid');
              timeout = setTimeout(function() {
                achievement.setupTooltip(tooltipContainer);
              }, 500);
            })
            .mouseleave(function() {
              $(this).css('border', achievement.color + ' 2.5px solid');
              clearTimeout(timeout);
              $tooltip.fadeOut().css('display', 'none');
            })
            .mousemove(function(e) {
              $tooltip.css({
                'left' : (e.pageX + 10) + 'px',
                'top' : (e.pageY + 10) + 'px'
              })
            })
            .appendTo(grid);

            $(document.createElement('img')).attr('src', achievement.src)
                                                  .css({
                                                    'display' : 'block',
                                                    'margin' : 'auto',
                                                    'width' : '100%',
                                                    'height' : 'auto',
                                                    'opacity' : achievement.hidden ? '0.2' : '0.8'
                                                  }).appendTo($container);
          }
          
          function populateGrid(skills, container, header, points_template) {
            const info = container.children(':first');
            const points = info.children(':first');
            const grid = container.children(':last');
            let max_level = 0;
            let level = 0;
            let max_reward = 0;
            let reward = 0;

            Object.keys(skills).forEach(function(title) {
              const achievement = skills[title];
              max_level += achievement.max_progress;
              level += achievement.progress;
              max_reward += achievement.max_reward;
              if (!achievement.hidden) {
                reward += achievement.accumulated_reward;
              }

              generateContainer(grid, achievement);
            });

            info.text(header);
            points.text(points_template(`${level}/${max_level}`, `${reward}/${max_reward}`));
            const percentage = level / max_level * 100;
            let color;
            Object.keys(Achievement.percentiles).some(function(percentile) {
              color = Achievement.alternative_colors[Achievement.percentiles[percentile]];
              return percentage < percentile;
            });
            points.css('color', color);
            points.appendTo(info);
          }

          parseSkills();
          populateGrid(skills, $skill_grid, 'Боевые Навыки.  ', (levels, rewards) => `${levels}  (${rewards})`);
          populateGrid(extra_skills, $extras_grid, 'Дополнительные Награды.  ', (levels, rewards) => `${levels} (${rewards})`);
          populateGrid(daily_achievements, $daily_achievements_grid, 'Ежедневные Награды.  ', (levels, rewards) => `${levels} (${rewards})`);
        }

      } else if (isURL('/blog') ||
                isURL('/all') ||
                isURL('/news') ||
                isURL('/topics') ||
                isURL('/clans') ||
                isURL('/personal') ||
                isURL('/sandbox') ||
                isURL('/flood') ||
                window.location.pathname.match(/^\/[0-9]*$/) != null) {
                  console.log('page with topics')
                  BRP.paginationEnabled = true;
                  handleTopics();
      } else if (isURL('/topic')) {
        console.log('inside the topic')
        handleComments();
      }
    }
  });

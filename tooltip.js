class Tooltip {
    constructor($container, $title, $level, $points, $description) {
      this.$container = $container;
      this.$title = $title;
      this.$level = $level;
      this.$points = $points;
      this.$description = $description;
    }

    setLocked() {
      this.$level.hide();
      this.$points.hide();
    }

    setDaily() {
      this.$level.hide();
      this.$points.css('margin-left', '0px');
    }

    restoreMargin() {
      this.$points.css('margin-left', '10px');
    }

    setTitle(title, subtitle, color) {
      this.$title.text(`${title}. ${subtitle}`).css('color', color);
    }

    setLevel(level) {
      this.$level.text(`Уровень ${level}.`).show();
    }

    setPoints(reward, accumulated_reward) {
      this.$points.text(`+${reward} очков репутации. (${accumulated_reward})`).show();
    }

    setDescription(description, color) {
      this.$description.text(description).css('color', color);
    }

    show() {
      this.$container.show();
    }
  }

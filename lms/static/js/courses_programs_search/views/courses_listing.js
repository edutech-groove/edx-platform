(function(define) {
    define([
        'jquery',
        'underscore',
        'backbone',
        'gettext',
        'js/courses_programs_search/views/course_card'
    ], function($, _, Backbone, gettext, CourseCardView) {
        'use strict';

        return Backbone.View.extend({

            el: '.search-content',
            $window: $(window),
            $document: $(document),

            initialize: function() {
                this.attachScrollHandler();
            },

            render: function(type) {
                this.searchingType = type;

                if (type === 'all') {
                    this.$list = {
                        courses: this.$el.find('#programs-list .courses-listing'),
                        programs: this.$el.find('#courses-list .courses-listing')
                    }
                    this.$el.find('.search-content-container').show();
                } else {
                    this.$list = {
                        [type]: this.$el.find('#' + type + '-list .courses-listing')
                    };
                    this.$el.find('.search-content-container').hide();
                    this.$el.find('#' + type + '-list').show();
                }

                var count = this.model.totalcount();
                $('#page-count').text(count);
                this.preRenderItems();
                return this;
            },

            renderNext: function() {
                this.preRenderItems();
                this.isLoading = false;
            },

            preRenderItems: function() {
                if (this.searchingType === 'all') {
                    this.renderItems('courses');
                    this.renderItems('programs');
                } else {
                    this.renderItems(this.searchingType);
                }
            },

            renderItems: function(type) {
                /* eslint no-param-reassign: [2, { "props": true }] */
                this.$list[type].empty();
                var latest = this.model.latest();
                var items = latest[type].map(function(result) {
                    result.userPreferences = this.model.userPreferences;
                    var item = new CourseCardView({model: result});
                    return item.render().el;
                }, this);
                this.$list[type].append(items);
                /* eslint no-param-reassign: [2, { "props": false }] */
            },

            attachScrollHandler: function() {
                this.$window.on('scroll', _.throttle(this.scrollHandler.bind(this), 400));
            },

            scrollHandler: function() {
                if (this.isNearBottom() && !this.isLoading) {
                    this.trigger('next');
                    this.isLoading = true;
                }
            },

            isNearBottom: function() {
                var scrollBottom = this.$window.scrollTop() + this.$window.height();
                var threshold = this.$document.height() - 200;
                return scrollBottom >= threshold;
            }

        });
    });
}(define || RequireJS.define));

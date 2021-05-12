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
            },

            render: function(type, searchingType) {
                this.searchingType = type;

                if (searchingType === 'all') {
                    this.$list = {
                        programs: this.$el.find('#programs-list .courses-listing'),
                        courses: this.$el.find('#courses-list .courses-listing')
                    }
                    this.$el.find('.search-content-container').show();
                } else {
                    this.$list = {
                        [type]: this.$el.find('#' + type + '-list .courses-listing')
                    };
                    this.$el.find('.search-content-container').hide();
                    this.$el.find('#' + type + '-list').show();
                }

                this.preRenderItems();
                return this;
            },

            renderNext: function() {
                this.preRenderItems();
                this.isLoading = false;
            },

            preRenderItems: function() {
                // if (this.searchingType === 'all') {
                //     this.renderItems('programs');
                //     this.renderItems('courses');
                // } else {
                    this.renderItems(this.searchingType);
                // }
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


        });
    });
}(define || RequireJS.define));

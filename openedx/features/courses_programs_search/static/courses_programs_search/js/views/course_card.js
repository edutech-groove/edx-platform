(function(define) {
    define([
        'jquery',
        'underscore',
        'backbone',
        'gettext',
        'edx-ui-toolkit/js/utils/date-utils',
        'edx-ui-toolkit/js/utils/html-utils',
        'text!courses_programs_search/templates/course_card.underscore'
    ], function($, _, Backbone, gettext, DateUtils, HtmlUtils, CourseCardTemplate) {
        'use strict';

        function formatDate(date, userLanguage, userTimezone) {
            var context;
            context = {
                datetime: date,
                language: userLanguage,
                timezone: userTimezone,
                format: DateUtils.dateFormatEnum.shortDate
            };
            return DateUtils.localize(context);
        }
        console.log("oooooooooooooo");
        console.log(CourseCardTemplate);
        return Backbone.View.extend({

            tagName: 'li',
            className: 'courses-listing-item',

            initialize: function() {
                this.tpl = _.template(CourseCardTemplate);
                //HtmlUtils.setHtml(this.$el, HtmlUtils.template(CourseCardTemplate)({}));
                //console.log(this.$el);
                // console.log(this.tpl);

            },
            render: function() {
                var data = _.clone(this.model.attributes);
                var userLanguage = '',
                    userTimezone = '';
                if (this.model.userPreferences !== undefined) {
                    userLanguage = this.model.userPreferences.userLanguage;
                    userTimezone = this.model.userPreferences.userTimezone;
                }
                if (data.advertised_start !== undefined) {
                    data.start = data.advertised_start;
                } else {
                    data.start = formatDate(
                        new Date(data.start),
                        userLanguage,
                        userTimezone
                    );
                }
                data.enrollment_start = formatDate(
                    new Date(data.enrollment_start),
                    userLanguage,
                    userTimezone
                );
                this.$el.html(this.tpl(data));
                return this;
            }

        });
    });
}(define || RequireJS.define));

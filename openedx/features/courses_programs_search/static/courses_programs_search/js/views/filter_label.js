(function(define) {
    define([
        'jquery',
        'underscore',
        'backbone',
        'gettext',
        'text!courses_programs_search/templates/filter.underscore'
    ], function($, _, Backbone, gettext, Filter) {
        'use strict';

        return Backbone.View.extend({

            tagName: 'li',
            className: 'active-filter',

            initialize: function() {
                this.tpl = _.template(filter);
                this.listenTo(this.model, 'remove', this.remove);
                this.listenTo(this.model, 'change', this.render);
            },

            render: function() {
                var data = _.clone(this.model.attributes);
                data.name = data.name || data.query;
                this.className = data.type;
                this.$el.html(this.tpl(data));
                return this;
            }

        });
    });
}(define || RequireJS.define));

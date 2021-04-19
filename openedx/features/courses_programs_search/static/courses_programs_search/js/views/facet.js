(function(define) {
    define([
        'jquery',
        'underscore',
        'backbone',
        'gettext',
        'text!courses_programs_search/templates/facet.underscore'
    ], function($, _, Backbone, gettext, Facet) {
        'use strict';

        return Backbone.View.extend({

            tagName: 'li',
            className: '',

            initialize: function() {
                this.tpl = _.template(Facet);
            },

            render: function(type, name, term, count) {
                this.$el.html(this.tpl({name: name, term: term, count: count}));
                this.$el.attr('data-facet', type);
                return this;
            },

            remove: function() {
                this.stopListening();
                this.$el.remove();
            }

        });
    });
}(define || RequireJS.define));

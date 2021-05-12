(function(define) {
    define([
        'underscore',
        'backbone',
    ], function(_, Backbone) {
        'use strict';

        return Backbone.Model.extend({
            
            url: null,
            jqhxr: null,
            results: null,
            url: '/search/auto_suggestion/',

            initialize: function() {
            },

            parse: function(response) {
                this.set({
                    results: response
                });
            },

            reset: function() {
            },
        });
    });
}(define || RequireJS.define));

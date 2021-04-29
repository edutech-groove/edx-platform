(function(define) {
    define([
        'jquery',
        'underscore',
        'backbone',
        'gettext',
        'js/courses_programs_search/models/filter',
        'js/courses_programs_search/views/filter_label',
    ], function($, _, Backbone, gettext, Filter, FilterLabel) {
        'use strict';

        return Backbone.View.extend({

            el: '#filter-bar',
            templateId: '#filter_bar-tpl',

            events: {
                'click #clear-all-filters': 'clearAll',
                'click li .discovery-button': 'clearFilter'
            },

            initialize: function() {
                this.tpl = _.template($(this.templateId).html());
                this.render();
                this.listenTo(this.collection, 'remove', this.hideIfEmpty);
                //this.listenTo(this.collection, 'add', this.addFilter);
                this.listenTo(this.collection, 'add', this.reGenerateFilter);
                this.listenTo(this.collection, 'reset', this.resetFilters);
            },

            render: function() {
                this.$el.html(this.tpl());
                this.$ul = this.$el.find('ul');
                this.$el.addClass('is-animated');
                return this;
            },

            reGenerateFilter: function(filter) {
                // console.log(filter);
                if (filter && filter.attributes && filter.attributes.query) {
                    // console.log(filter);
                    var _this = this;
                    // filter.attributes.query.forEach(function (item) {
                    //     var tempFilter = filter.clone();
                    //     tempFilter.attributes.query = item;
                    //     var label = new FilterLabel({model: tempFilter});
                    //     console.log(_this.collection);
                    //     _this.$ul.append(label.render().el);
                    // });
                    this.show();
                    this.$el.show();
                }
            },

            addFilter: function(filter) {
                // console.log(filter);
                if (filter && filter.attributes && filter.attributes.query) {
                    // console.log(filter);
                    var _this = this;
                    // filter.attributes.query.forEach(function (item) {
                    //     var tempFilter = filter.clone();
                    //     tempFilter.attributes.query = item;
                    //     var label = new FilterLabel({model: tempFilter});
                    //     console.log(_this.collection);
                    //     _this.$ul.append(label.render().el);
                    // });
                    this.show();
                    this.$el.show();
                }
            },

            hideIfEmpty: function(filter) {
                console.log(this.collection);
                if (this.collection.isEmpty()) {
                    this.hide();
                }
            },

            resetFilters: function() {
                this.$ul.empty();
                this.hide();
                this.$el.hide();
            },

            clearFilter: function(event) {
                var $target = $(event.currentTarget);
                var filter = this.collection.get($target.data('type'));
                this.trigger('clearFilter', filter.id);
            },

            clearAll: function(event) {
                this.trigger('clearAll');
            },

            show: function() {
                this.$el.removeClass('is-collapsed');
            },

            hide: function() {
                this.$ul.empty();
                this.$el.addClass('is-collapsed');
                this.$el.hide();
            }

        });
    });
}(define || RequireJS.define));

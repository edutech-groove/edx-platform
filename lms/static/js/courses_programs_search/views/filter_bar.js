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
                'click #toggle-view-filters': 'toggleViewFilters',
                'click li .discovery-button': 'clearFilter',
            },

            initialize: function() {
                this.tpl = _.template($(this.templateId).html());
                this.render();
                this.listenTo(this.collection, 'remove', this.hideIfEmpty);
                this.listenTo(this.collection, 'add', this.reGenerateFilter);
                this.listenTo(this.collection, 'reset', this.resetFilters);
                this.listenTo(this.collection, 'change', this.reGenerateFilter);
            },

            render: function() {
                this.$el.html(this.tpl());
                this.$ul = this.$el.find('ul');
                this.$el.addClass('is-animated');
                return this;
            },

            reGenerateFilter: function() {
                this.numOfChipTags = 0;
                this.hide();
                var _this = this;
                this.collection.models.forEach(function (filter) {
                    // console.log(filter.attributes.query);
                    if (filter && filter.attributes && filter.attributes.query) {
                        filter.attributes.query.forEach(function (item) {
                            if (item.key != "search_query") {
                                _this.numOfChipTags ++;
                                var tempFilter = filter.clone();
                                tempFilter.attributes.query = item;
                                var label = new FilterLabel({model: tempFilter});
                                var labelEl = label.render().el
    
                                if (_this.numOfChipTags > 3) {
                                    $(labelEl).addClass('extra hidden');
                                }
    
                                _this.$ul.append(labelEl);
                            }
                        });
                    }
                });

                if (this.numOfChipTags > 0) {
                    this.show();
                    this.$el.show();
                    if (this.numOfChipTags > 3) {
                        this.$el.find('#toggle-view-filters').show().text('+' + (this.numOfChipTags - 3));
                    } else {
                        this.$el.find('#toggle-view-filters').hide().empty();
                    }
                }
            },

            hideIfEmpty: function() {
                this.reGenerateFilter();
                
                if (this.collection.isEmpty()) {
                    this.hide();
                }
            },

            resetFilters: function() {
                // this.collection.reset();
                this.$ul.empty();
                this.hide();
                this.$el.hide();
            },

            clearFilter: function(event) {
                var $target = $(event.currentTarget);
                var filter = this.collection.get($target.data('type'));
                var value = $target.data('value');
                this.trigger('clearFilter', filter.id, value);
            },

            clearAll: function(event) {
                this.collection.reset();
                this.trigger('clearAll');
            },

            show: function() {
                this.$el.removeClass('is-collapsed');
            },

            hide: function() {
                this.$ul.empty();
                this.$el.addClass('is-collapsed');
                this.$el.hide();
            },

            toggleViewFilters: function() {
                this.isViewMoreFilter = !this.isViewMoreFilter;
                if (this.isViewMoreFilter) {
                    this.$el.find('#toggle-view-filters').text('View less');
                    this.$ul.find('.extra').removeClass('hidden');
                } else {
                    this.$el.find('#toggle-view-filters').text('+' + (this.numOfChipTags - 3));
                    this.$ul.find('.extra').addClass('hidden');
                }
            }

        });
    });
}(define || RequireJS.define));

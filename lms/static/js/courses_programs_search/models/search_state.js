(function(define) {
    define([
        'underscore',
        'backbone',
        'js/courses_programs_search/models/course_discovery',
        'js/courses_programs_search/collections/filters',
        'js/courses_programs_search/models/url_search_params'
    ], function(_, Backbone, CourseDiscovery, Filters, UrlSearchParams) {
        'use strict';


        return Backbone.Model.extend({

            page: 0,
            pageSize: 20,
            searchTerm: '',
            terms: {},
            jqhxr: null,
            searchingType: 'discovery',
            urlSearchParams: new UrlSearchParams(),

            initialize: function() {
                this.discovery = new CourseDiscovery();
                this.program = new CourseDiscovery(true);
                // console.log(this.discovery);
                // console.log(this.program);
                this.listenTo(this.discovery, 'sync', this.onSync, this);
                this.listenTo(this.discovery, 'error', this.onError, this);
                this.listenTo(this.program, 'sync', this.onSync, this);
                this.listenTo(this.program, 'error', this.onError, this);
            },

            performSearch: function(searchTerm, otherTerms) {
                this.reset();
                this.searchTerm = searchTerm;
                if (otherTerms) {
                    this.terms = otherTerms;
                }
                this.sendQuery(this.buildQuery());
            },

            refineSearch: function(terms) {
                // console.log(terms);
                this.reset();
                this.terms = terms;
                this.sendQuery(this.buildQuery());
            },

            loadNextPage: function() {
                if (this.hasNextPage()) {
                    this.sendQuery(this.buildQuery(this.page + 1));
                }
            },

        // private

            hasNextPage: function() {
                if (this[this.searchingType]) {
                    var total = this[this.searchingType].get('totalCount');
                    return total - ((this.page + 1) * this.pageSize) > 0;
                }
            },

            sendQuery: function(data) {
                if (this[this.searchingType]) {
                    this.jqhxr && this.jqhxr.abort();
                    this.jqhxr = this[this.searchingType].fetch({
                        type: 'POST',
                        data: data
                    });
                    return this.jqhxr;
                }
            },

            buildQuery: function() {
                var data = {
                    search_string: this.searchTerm,
                    page_size: this.pageSize,
                    page_index: this.page
                };
                _.extend(data, this.terms);

                // console.log(this.terms);
                this.buildSearchQueryUrl();
                return data;
            },

            reset: function() {
                // if (this[this.searchingType]) {
                //     this[this.searchingType].reset();
                // }
                // this.page = 0;
                this.errorMessage = '';
            },

            onError: function(collection, response, options) {
                if (response.statusText !== 'abort') {
                    this.errorMessage = response.responseJSON.error;
                    this.trigger('error');
                }
            },

            onSync: function(collection, response, options) {
                // console.log(options);
                var total = this[this.searchingType].get('totalCount');
                var originalSearchTerm = this.searchTerm;
                this[this.searchingType].facetOptions.each(function(option) {
                    option.set('selected', false);
                });
                if (options.data.page_index === 0) {
                    // if (total === 0) {
                    // // list all courses
                    //     this.cachedDiscovery().done(function(cached) {
                    //         this[this.searchingType].courseCards.reset(cached.courseCards.toJSON());
                    //         this[this.searchingType].facetOptions.reset(cached.facetOptions.toJSON());
                    //         this[this.searchingType].set('latestCount', cached.get('latestCount'));
                    //         this.trigger('search', originalSearchTerm, total);
                    //     });
                    //     this.searchTerm = '';
                    //     this.terms = {};
                    // } else {
                        var _this = this;
                        this[this.searchingType].facetOptions.each(function(option) {
                            _.each(_this.terms, function(terms, facet) {
                                if (facet !== 'search_query') {
                                        
                                        terms.forEach(function (term) {
                                            if (option.attributes.facet == facet) {

                                                if (option.attributes.term == term) {
                                                    option.set('selected', true);
                                                }
                                            }
                                        });
                                }
                            }, _this);
                        })
                        this.trigger('search', this.searchTerm, total);
                    // }
                } else {
                    this.page = options.data.page_index;
                    this.trigger('next');
                }
            },

        // lazy load
            cachedDiscovery: function() {
                var deferred = $.Deferred();
                var self = this;

                if (this.cached) {
                    deferred.resolveWith(this, [this.cached]);
                } else {
                    this.cached = new CourseDiscovery();
                    // console.log(this.cached);
                    this.cached.fetch({
                        type: 'POST',
                        data: {
                            search_string: '',
                            page_size: this.pageSize,
                            page_index: 0
                        },
                        success: function(model, response, options) {
                            deferred.resolveWith(self, [model]);
                        }
                    });
                }
                return deferred.promise();
            },

            buildSearchQueryUrl: function() {

                // console.log(this.urlSearchParams.queryToObject());
                // console.log(this.urlSearchParams.objectToQuery(this.urlSearchParams.queryToObject()));

                // console.log(this.terms);
                var params = {};
                var hasTermsQuery = false;
                params.q = this.searchTerm;
                var _this = this;
                Object.keys(this.terms).forEach(function (key) {
                    params[key] = [];
                    _this.terms[key].forEach(function (term) {
                        params[key].push(term);
                        hasTermsQuery = true;
                    });
                });

                var urlParams = this.urlSearchParams.queryToObject();
                var tab = urlParams.tab;
                if (tab) {
                    params.tab =tab;
                }

                if (urlParams.q != params.q || !_.isEqual(params, urlParams)) {
                    // console.log(this.urlSearchParams.objectToQuery(params));
                    history.pushState(params, '', this.urlSearchParams.objectToQuery(params) ? '?' + this.urlSearchParams.objectToQuery(params) : '/search');
                }
            }
        });
    });
}(define || RequireJS.define));

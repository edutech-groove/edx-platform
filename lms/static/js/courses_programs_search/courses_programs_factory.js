(function(define) {
    'use strict';

    define(['backbone', 'js/courses_programs_search/models/search_state', 'js/courses_programs_search/collections/filters',
        'js/courses_programs_search/views/search_form', 'js/courses_programs_search/views/courses_listing',
        'js/courses_programs_search/views/filter_bar', 'js/courses_programs_search/views/refine_sidebar'],
        function(Backbone, SearchState, Filters, SearchForm, CoursesListing, FilterBar, RefineSidebar) {
            return function(meanings, searchQuery, userLanguage, userTimezone) {
                activateMenuTab($('#tab-search a[href^="' + (location.search ? location.search : '/' + location.pathname.split("/")[1]) + '"]'));
                var dispatcher = _.extend({}, Backbone.Events);
                var search = new SearchState();
                var filters = new Filters();
                var form = new SearchForm();
                var filterBar = new FilterBar({collection: filters});
                var refineSidebar = new RefineSidebar({
                    collection: search.discovery.facetOptions,
                    meanings: meanings
                });
                var listing;
                var courseListingModel = search.discovery;
                var programListingModel = search.program;
                
                $('#tab-search a').on('click.search', function(e) {
                    e.preventDefault();
                    var url = this.href;
                    var tabName = $(this).data('tab-name');
                    var state = { 'tabName': tabName };
                    history.pushState(state, '', url);
                    listing.model = tabName === 'discovery' ? courseListingModel : programListingModel;
                    search.searchingType = tabName;
                    form.doSearch();
                    activateMenuTab($(this));
                });

                $('#pagination').pagination({
                    items: 100,
                    itemsOnPage: 10,
                    onPageClick(pageNumber, event){
                        // alert(pageNumber);
                        search.page = pageNumber - 1;
                        form.doSearch();
                    },
                    prevText: '<svg width="5" height="9"><use xlink:href="#paging-prev-icon"></use></svg>',
                    nextText: '<svg width="5" height="9"><use xlink:href="#paging-next-icon"></use></svg>'
                });

                window.onpopstate = function (event){
                    // todo
                    activateMenuTab($('#tab-search [data-tab-name=' + event.state.tabName + ']'));
                    form.doSearch();
                }

                courseListingModel.userPreferences = {
                    userLanguage: userLanguage,
                    userTimezone: userTimezone
                };

                programListingModel.userPreferences = {
                    userLanguage: userLanguage,
                    userTimezone: userTimezone
                };

                listing = new CoursesListing({model: courseListingModel});
                dispatcher.listenTo(form, 'search', function(query) {
                    filters.reset();
                    form.showLoadingIndicator();
                    search.performSearch(query, filters.getTerms());
                });

                dispatcher.listenTo(refineSidebar, 'selectOption', function(type, query) {
                    form.showLoadingIndicator();
                    // if (filters.get(type)) {
                    //     removeFilter(type);
                    // } else {
                            if (filters.get(type)) {
                                removeFilter(type);
                            }
                        if (query && query.length) {
                            // query.forEach(function (item) {
                                 filters.add({type: type, query: query});
                            // });

                            console.log(filters);
                        }

                        // console.log(filters);
                        // search.refineSearch(filters.getTerms());
                    // }
                });

                dispatcher.listenTo(filterBar, 'clearFilter', removeFilter);

                dispatcher.listenTo(filterBar, 'clearAll', function() {
                    form.doSearch('');
                });

                dispatcher.listenTo(listing, 'next', function() {
                    search.loadNextPage();
                });

                dispatcher.listenTo(search, 'next', function() {
                    listing.renderNext();
                });

                dispatcher.listenTo(search, 'search', function(query, total) {
                    if (total > 0) {
                        form.showFoundMessage(total);
                        if (query) {
                            filters.add(
                                {type: 'search_query', query: query, name: quote(query)},
                                {merge: true}
                            );
                        }
                    } else {
                        form.showNotFoundMessage(query);
                        filters.reset();
                    }
                    form.hideLoadingIndicator();
                    listing.render();
                    refineSidebar.render();
                    $('.page-title .title #records-count').text(listing.model.datafake.length + ' results');
                });

                dispatcher.listenTo(search, 'error', function() {
                    form.showErrorMessage(search.errorMessage);
                    form.hideLoadingIndicator();
                });

                // kick off search on page refresh
                form.doSearch(searchQuery);

                function removeFilter(type) {

                    // console.log(filters);
                    form.showLoadingIndicator();
                    filters.remove(type);
                    if (type === 'search_query') {
                        form.doSearch('');
                    } else {
                        // search.refineSearch(filters.getTerms());
                    }
                }

                function quote(string) {
                    return '"' + string + '"';
                }

                function activateMenuTab(nav) {
                    $('#tab-search > ul > li').removeClass('active');
                    nav.parentsUntil('ul').addClass('active');
                    $('.page-title .title #main-title').text(nav.text());
                }
            };
        });
}(define || RequireJS.define));

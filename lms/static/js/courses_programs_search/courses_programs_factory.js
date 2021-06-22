(function(define) {
    'use strict';

    define(['backbone', 'js/courses_programs_search/models/search_state', 'js/courses_programs_search/collections/filters',
        'js/courses_programs_search/views/search_form', 'js/courses_programs_search/views/courses_listing',
        'js/courses_programs_search/views/filter_bar', 'js/courses_programs_search/views/refine_sidebar',
        'js/courses_programs_search/models/url_search_params'],
        function(Backbone, SearchState, Filters, SearchForm, CoursesListing, FilterBar, RefineSidebar, UrlSearchParams) {
            return function(meanings, searchQuery, userLanguage, userTimezone) {
                var dispatcher = _.extend({}, Backbone.Events);
                var search = new SearchState();
                var filters = new Filters();
                filters.comparator = 'index';
                var form = new SearchForm();
                var filterBar = new FilterBar({collection: filters});
                var refineSidebar = new RefineSidebar({
                    collection: search.records.facetOptions,
                    meanings: meanings
                });
                var listing;
                var courseListingModel = search.records;
                var urlSearchParams = new UrlSearchParams();
                var searchingType;
                var isSearching;
                onInit();
                
                $('a.jump-to-tab').on('click', function(e) {
                    e.preventDefault();
                    var url = this.href;
                    var tab = $(this).data('tab-name');
                    var state = { 'tab': tab };
                    history.pushState(state, '', url);
                    search.searchingType = tab;
                    search.page = 0;
                    activateTab($('#tab-search [data-tab-name=' + tab + ']'), tab);
                });

                window.onpopstate = function (event){
                    if (event.state) {
                        var tab = event.state.tab || 'all';
                        activateTab($('#tab-search [data-tab-name=' + tab + ']'), tab);

                        var params = {};
    
                        if (event.state.q) {
                            params.q = event.state.q;
                            $(form.$searchField).val(event.state.q);
                        }
                        
                        if (event.state.tab) {
                            params.tab = event.state.tab;
                        }
        
                        history.replaceState(params, '', '?' + urlSearchParams.objectToQuery(params));
                    }
                }

                courseListingModel.userPreferences = {
                    userLanguage: userLanguage,
                    userTimezone: userTimezone
                };

                listing = new CoursesListing({model: courseListingModel});
                dispatcher.listenTo(form, 'search', function(query, resetFilters, containerType) {
                    if (resetFilters) {
                        filters.reset();
                    }
                    form.showLoadingIndicator();
                    search.performSearch(query, filters.getTerms(), containerType);
                });

                dispatcher.listenTo(form, 'submit', function() {
                    formDoSearch();
                });

                dispatcher.listenTo(refineSidebar, 'selectOption', function(type, index, query) {
                    form.showLoadingIndicator();
                    if (filters.get(type)) {
                        removeFilter(type);
                    }
                    if (query) {
                        filters.add({type: type, query: query, index: index});
                    }
                    searchRefine(filters);
                });

                dispatcher.listenTo(filterBar, 'clearFilter', removeFilter);

                dispatcher.listenTo(filterBar, 'clearAll', function() {
                    formDoSearch();
                });


                dispatcher.listenTo(search, 'next', function() {
                    form.hideLoadingIndicator();
                    refineSidebar.render();
                    listing.renderNext();
                });

                dispatcher.listenTo(search, 'updatepaging', function(total) {
                    $('#demo').pagination({
                        items: total,
                        itemsOnPage: search.getPageSize(),
                        onPageClick(pageNumber, event){
                            event.preventDefault();
                            search.page = pageNumber - 1;
                            formDoSearch(false);
                        }
                    });
                });

                dispatcher.listenTo(search, 'search', function(query, total, containerType, resetFacets) {
                    form.hideLoadingIndicator();
                    containerType = containerType || searchingType;
                    refineSidebar.render(containerType, searchingType, resetFacets);
                    listing.render(containerType, searchingType);
                    if (searchingType === 'all') {
                        $('.search-content-container .page-title .right-side .pagination').empty();
                        $('#' + containerType + '-list .page-title .left-side .records-count').text(total[containerType] + ' results');
                        $('#' + containerType + '-list .page-title .right-side .navigation').text('Show (' + total[containerType] + ')');
                    } else {
                        $('.search-content-container .page-title .right-side .navigation').empty();
                        $('#' + searchingType + '-list .page-title .left-side .records-count').text(total[searchingType] + ' results');

                        $('.search-content-container .page-title .right-side .pagination').pagination({
                            items: total[searchingType],
                            itemsOnPage: search.getPageSize(),
                            onPageClick(pageNumber, event){
                                event.preventDefault();
                                search.page = pageNumber - 1;
                                formDoSearch(false);
                            },
                            prevText: '<svg width="5" height="9"><use xlink:href="#paging-prev-icon"></use></svg>',
                            nextText: '<svg width="5" height="9"><use xlink:href="#paging-next-icon"></use></svg>'
                        });
                    }

                });

                dispatcher.listenTo(search, 'error', function() {
                    form.showErrorMessage(search.errorMessage);
                    form.hideLoadingIndicator();
                });

                dispatcher.listenTo(search, 'searchAutoSuggest', function(response) {
                    onOpenSearchSuggestions(response);
                });

                function removeFilter(type, value = null) {
                    form.showLoadingIndicator();

                    if (value) {
                        var query = _.clone(filters.get(type).attributes.query)
                        var queryIndex = query.findIndex(function (item) { return item.key == value; });
                        if (queryIndex > -1) {
                            query.splice(queryIndex, 1);
                        }
                        if (!query.length) {
                            filters.remove(type);
                        } else {
                            filters.get(type).set({query: query});
                        }
                    } else {
                        filters.remove(type);
                    }
                    searchRefine(filters);
                }

                function quote(string) {
                    return '"' + string + '"';
                }

                function activateTab(nav, tab) {
                    $('#tab-search > ul > li').removeClass('active');
                    nav.parentsUntil('ul').addClass('active');
                    searchingType = tab || 'all';
                    formDoSearch(true, tab);
                }

                function searchRefine(filters) {
                    var tab = urlSearchParams.queryToObject().tab;

                    if (tab && tab !== 'all') {
                        setTimeout(() => {
                            search.reInitRecords(tab);
                            search.refineSearch(filters.getTerms(), tab);
                        });
                    } else {
                        setTimeout(() => {
                            search.reInitRecords('programs');
                            search.refineSearch(filters.getTerms(), 'programs');
                            search.reInitRecords('courses');
                            search.refineSearch(filters.getTerms(), 'courses');
                        });
                    }
                }

                function formDoSearch(resetFilter = true, tab = null) {
                    tab = tab || urlSearchParams.queryToObject().tab;

                    if (tab && tab !== 'all') {
                        setTimeout(() => {
                            search.reInitRecords(tab);
                            form.doSearch(undefined, resetFilter);
                        });
                    } else {
                        setTimeout(() => {
                            search.reInitRecords('programs');
                            form.doSearch($(form.$searchField).val(), resetFilter, 'programs');
                            search.reInitRecords('courses');
                            form.doSearch($(form.$searchField).val(), resetFilter, 'courses');
                        });
                    }
                }

                $(form.$searchField).on('input', function() {
                    isSearching = true;
                });

                $(form.$searchField).on('input', debounce(function() {
                    onSearchSuggestions();
                }, 500));

                $(form.$searchField).on('keydown', function(e) {
                    if ([38, 40].includes(e.keyCode)) {
                        isSearching = true;
                        onSearchSuggestions();
                    } else if ([27, 13].includes(e.keyCode)) {
                        onCloseSearchSuggestions();
                    }
                });

                $('#view-all-results-button').on('click', function() {
                    onViewAllSearchResults();
                });

                $(document).on('click', function() {
                    onCloseSearchSuggestions();
                });
                  
                $('#discovery-form').on('click', function(event){
                    event.stopPropagation();
                });

                function onCloseSearchSuggestions() {
                    $('#search-suggestions > .search-suggestions-container').empty();
                    $('#search-suggestions').hide();
                    isSearching = false;
                }

                function onSearchSuggestions() {
                    if (isSearching) {
                        var text = $(form.$searchField).val();

                        if (text.length) {
                            search.getAutoSuggestions({ search_string: text });
                        }
                    }
                }

                function onOpenSearchSuggestions(suggestions) {
                    var isEmpty = true;
                    var itemEl = $('<div class="records-wrapper">');
                    suggestions.forEach(function (item) {
                        if (item.records.length) {
                            isEmpty = false;
                            itemEl.append('<h3>' + (item.type === 'Program' ? 'Programs' : 'Courses') + '</h3>');
                            var ulEl = $('<ul>');
                            item.records.forEach(function (record) {
                                var subItemEl = '<li><a href="/' + (item.type === 'Program' ? 'programs' : 'courses') + '/' + record.url + '/about' + '">' + record.name;
                                if (record.org) {
                                    subItemEl += '<span class="badge">' + record.org + '</span>';
                                }
                                subItemEl += '</a></li>';
                                ulEl.append(subItemEl);
                            });
                            ulEl.appendTo(itemEl);
                        }
                    });

                    if (isEmpty) {
                        onCloseSearchSuggestions();
                    } else {
                        $('#search-suggestions > .search-suggestions-container').empty().append(itemEl);
                        $('#search-suggestions').show();
                    }
                }

                function onViewAllSearchResults() {
                    onCloseSearchSuggestions();
                    
                    var params = {
                        q: $(form.$searchField).val()
                    }
                    history.pushState(params, '', '/search/?' + urlSearchParams.objectToQuery(params));
                    search.searchingType = 'all';
                    search.page = 0;
                    activateTab($('#tab-search [data-tab-name=all]'), 'all');
                }

                function onInit() {
                    var params = {};
                    var urlParams = urlSearchParams.queryToObject();
                    var tab = urlParams.tab;
                    var q = urlParams.q;

                    if (q) {
                        params.q = q;
                        setTimeout(() => {
                            $(form.$searchField).val(q);
                        });
                    }

                    if (tab) {
                        params.tab = tab;
                    }

                    activateTab($('#tab-search a[href^="' + (tab ? ('?tab=' + tab) : '/' + location.pathname.split("/")[1]) + '"]'), tab);
    
                    history.pushState(params, '', Object.keys(params).length ? (urlSearchParams.objectToQuery(params) ? '?' + urlSearchParams.objectToQuery(params) : '') : '/search');
                    
                }

                function debounce(func, wait, immediate) {
                    var timeout;
                    return function() {
                        var context = this, args = arguments;
                        var later = function() {
                            timeout = null;
                            if (!immediate) func.apply(context, args);
                        };
                        var callNow = immediate && !timeout;
                        clearTimeout(timeout);
                        timeout = setTimeout(later, wait);
                        if (callNow) func.apply(context, args);
                    };
                };
            };
        });
}(define || RequireJS.define));

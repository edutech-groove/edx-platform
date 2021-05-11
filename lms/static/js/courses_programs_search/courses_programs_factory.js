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
                onInit();
                
                $('#tab-search a').on('click.search', function(e) {
                    e.preventDefault();
                    var url = this.href;
                    var tab = $(this).data('tab-name');
                    var state = { 'tab': tab };
                    history.pushState(state, '', url);
                    search.searchingType = tab;
                    search.page = 0;
                    activateTab($(this), tab);
                    form.doSearch();
                });

                window.onpopstate = function (event){
                    if (event.state) {
                        activateTab($('#tab-search [data-tab-name=' + event.state.tab + ']'), event.state.tab);

                        var params = {};
    
                        if (event.state.q) {
                            params.q = event.state.q;
                            $(form.$searchField).val(event.state.q);
                        }
                        
                        if (event.state.tab) {
                            params.tab = event.state.tab;
                        }
        
                        history.replaceState(params, '', '?' + urlSearchParams.objectToQuery(params));
                        form.doSearch();
                    }
                }

                courseListingModel.userPreferences = {
                    userLanguage: userLanguage,
                    userTimezone: userTimezone
                };

                listing = new CoursesListing({model: courseListingModel});
                dispatcher.listenTo(form, 'search', function(query) {
                    filters.reset();
                    form.showLoadingIndicator();
                    search.performSearch(query, filters.getTerms());
                });

                dispatcher.listenTo(refineSidebar, 'selectOption', function(type, index, query) {
                    form.showLoadingIndicator();
                    if (filters.get(type)) {
                        removeFilter(type);
                    }
                    if (query) {
                        filters.add({type: type, query: query, index: index});
                    }
                    search.refineSearch(filters.getTerms());
                });

                dispatcher.listenTo(filterBar, 'clearFilter', removeFilter);

                dispatcher.listenTo(filterBar, 'clearAll', function() {
                    form.doSearch();
                });

                dispatcher.listenTo(listing, 'next', function() {
                    search.loadNextPage();
                });

                dispatcher.listenTo(search, 'next', function() {
                    listing.renderNext();
                });

                dispatcher.listenTo(search, 'updatepaging', function(total) {
                    $('#demo').pagination({
                        items: total,
                        itemsOnPage: 1,
                        onPageClick(pageNumber, event){
                            search.page = pageNumber - 1;
                            form.doSearch();
                        }
                    });
                });

                dispatcher.listenTo(search, 'search', function(query, total) {
                    form.hideLoadingIndicator();
                    refineSidebar.render();
                    listing.render(searchingType);
                    $('.search-content-container .page-title .right-side .pagination').empty();
                    $('.search-content-container .page-title .right-side .navigation').empty();
                    if (searchingType === 'all') {
                        $('#courses-list .page-title .left-side .records-count').text(total.courses + ' results');
                        $('#programs-list .page-title .left-side .records-count').text(total.programs + ' results');
                        $('#courses-list .page-title .right-side .navigation').text('Show (' + total.courses + ')');
                        $('#programs-list .page-title .right-side .navigation').text('Show (' + total.programs + ')');
                    } else {
                        $('#' + searchingType + '-list .page-title .left-side .records-count').text(total[searchingType] + ' results');

                        var count = parseInt($('#page-count').text());
                        $('.search-content-container .page-title .right-side .pagination').pagination({
                            items: count,
                            itemsOnPage: 1,
                            onPageClick(pageNumber, event){
                                search.page = pageNumber - 1;
                                form.doSearch();
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

                    if (type === 'search_query') {
                        form.doSearch('');
                    } else {
                        search.refineSearch(filters.getTerms());
                    }
                }

                function quote(string) {
                    return '"' + string + '"';
                }

                function activateTab(nav, tab) {
                    $('#tab-search > ul > li').removeClass('active');
                    nav.parentsUntil('ul').addClass('active');
                    searchingType = tab || 'all';
                    search.reInitRecords(tab);
                }

                var projects = [
                    {
                        title: 'Course',
                        records: [{
                            name: 'El cerebro y las emociones en el lenguaje',
                            org: 'URosarioX'
                        }, {
                            name: 'El arte de vender: introducción a las ventas',
                            org: 'JaverianaX'
                        }, {
                            name: 'Introducción a los encofrados y las cimbras en obra civil y edificación',
                            org: 'UPValenciaX'
                        }]
                    },
                    {
                        title: 'Programs',
                        records: [{
                            name: 'History of China: Bronze Age to the last Dynasties',
                            org: 'HarvardX'
                        }, {
                            name: 'Internet de las cosas (IoT), Big Data y sus aplicaciones',
                            org: 'URosarioX'
                        }, {
                            name: 'Fundamentos de Microsoft Office para la empresa',
                            org: 'UPValenciaX'
                        }]
                    }
                ];

                $('#discovery-input').on('input', function() {
                    onSearchSuggestions();
                });

                $('#discovery-input').on('keydown', function(e) {
                    if ([38, 40].includes(e.keyCode)) {
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
                }

                function onSearchSuggestions() {
                    var text = $('#discovery-input').val();
                    
                    var itemEl = $('<div class="records-wrapper">');
                    projects.forEach(function (item) {
                        itemEl.append('<h3>' + item.title + '</h3>');
                        var ulEl = $('<ul>');
                        item.records.forEach(function (record) {
                            ulEl.append('<li><a href="#">' + record.name + '<span class="badge">' + record.org + '</span></a></li>');
                        });
                        ulEl.appendTo(itemEl);
                    });

                    $('#search-suggestions > .search-suggestions-container').empty().append(itemEl);
                    $('#search-suggestions').show();
                }

                function onViewAllSearchResults() {
                    form.doSearch();
                    onCloseSearchSuggestions();
                }

                function onInit() {
                    var params = {};
                    var urlParams = urlSearchParams.queryToObject();
                    var tab = urlParams.tab;
                    var q = urlParams.q;
                    activateTab($('#tab-search a[href^="' + (tab ? ('?tab=' + tab) : '/' + location.pathname.split("/")[1]) + '"]'), tab);

                    if (q) {
                        params.q = q;
                        setTimeout(() => {
                            $(form.$searchField).val(q);
                        });
                    }

                    if (tab) {
                        params.tab = tab;
                    }
    
                    history.pushState(params, '', Object.keys(params).length ? (urlSearchParams.objectToQuery(params) ? '?' + urlSearchParams.objectToQuery(params) : '') : '/search');
                    setTimeout(() => {
                        form.doSearch();
                    });
                }
            };
        });
}(define || RequireJS.define));

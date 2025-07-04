I'd like you to make a complete react 19 frontend application, and backend node fastify application using postgres, both written in typescript, that will recommend movies to me based on some data we will use you pass into it, and also allow me to search movies, actors, and directors from remote APIs.

The application well-architectued using S.O.L.I.D. principles. Any files that are longer than 500 lines should be separated to more discrete classes or helper files.

Their should be a separate recommendation engine class on the backend, that should take various inputs to help derive a suggested movie based on them. The input will be from the user's liked movies on external services such as IMDB and others, that we will import later to an internal postgres DB. It should also use the user's own reviews and ratings for the movies, pulled from IMDB, and also stored in the internal database if the user chooses to rate the movies from the application. The internal database should utilize a common movie ID (such as the IMDB or TMDB movie id) to reference the liked movies in the database and elsewhere.

The recommendation engine should utilize a third party library to determine the recommendation based on the data. If it is best to use an LLM or machine learning algorithm, then please design a separate class to determine the recommendation based on the database of all movies (in IMDB and elsewhere), and the user's input data. We can expand on the data for the recommendation engine later, after we import the movie data into our own database.

Later, I will ask you to write a script to import movie, actor, and director data to our own postgres DB, but you don't have to do that right now.

Integrate TMDB for the fallback search functionality, augmented with the local database data that we will import later. It should merge the two results. Any new results that aren't in our database should be added to it if their full details are queried and returnd from the third party services.

Here are my TMDB API details:

API Read Access Token:
eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1YjcxM2JhZTkyZDY0Y2FiNTM3Mzk1ODdkMGFmYzgwMSIsIm5iZiI6MTQ4ODkzMzU3NS42MjcsInN1YiI6IjU4YmY1MmM0OTI1MTQxNWYwMzAwMGQwOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.5ri-EoSJsbktzJz_6KnTlJXlAulxTCQokqGLDhaF9-U

API Key:
5b713bae92d64cab53739587d0afc801

For for the frontend app, create a progressive web application, that has a professional appearance using material ui library. The application should be bundled using esbuild, and use imported scss stylesheets for each page or component, or the global app, without any inline styles anywhere.  The website should include an option to enable dark or light mode, which changes the colors by adding or removing a class in the sass, and stores the selection option in local storage to be loaded when the application loads, among other user settings we can create later.
All of the components should use S.O.L.I.D. principles, and separate their services or helper method calls to separate classes, shared amongst them.

The website should include a home page with a navigation bar on the left. In the middle it lists the users favorite movies, actors, and directors, in separate grid 4x4 grid layouts on the homepage, if that many items exist for any of them.

The homepage should also include a search box at the top, with basic search filters... to search the backend fastify API for any movie, actor, or director. The search should be throttled to search the backend at most once every 250ms, and show the results as the user types in a hovering list below it, with the details for the results obtained from the backend, which I'll explain later. The search box should include a button called 'Advanced' that when clicked, expands a section below it to show more advanced search options, such as movie release year from and to, genre, minimum and maximum rating, and minimum number of ratings. If the user hits enter in the search box, it should go to a new /search page which lists all of the results and the selected filters on a separate full page.
Add radio buttons above the search box to select to search for 'all', or 'movie', or 'actor', or 'director'.
When changing the radio selection, the search results should show only those types of results, or all types if all is selected. The advanced search filter that expands below the search when clicked should show filters for the specific type of item such as movie, actor, or director. If 'all' is selected, it should show all filters, with the movie filters first, and actors filter below it, and director filter below that. The same filters should be used in the advanced homepage expanded view, and the standalone search page.

When showing the search results, show at the top what property the results are from (name, director, or actor). Then show the movie search results as a list that I can select up and down with the keyboard, and for each item show the movie title, the year it was released in brackets, the director name in parenthesis, and the IMDB or TMDB rating in parenthesis. The items should be in this format:
"Movie Title Name" - [year] - Director Name (rating)

When hitting enter on a search result, it should show the details for that movie in a new page called Movie Details. It should pull the data from the backend
It should show as many details as it can for the items, including:
-Simple metadata (title, year, director, imdb rating, number of votes)
-A link to the movie IMDB or TMDB page
-Movie description/synopsis
-Main characters and their actors
-My ratings and notes
-Related or Similar movies


The website should also have a separate details page for each item type, including Movie Details, Actor Details, and Director Details. Each details page should be full width and height, and show as many details as possible about the item in a professional and modern and elegant sass styling and colors.

The website should also have a page to manage different "lists", where the user can create lists and add any type of item to it, including moves, actors, and directors. The list management page should show a list of the user's list, with the number of items in each. When clicking a list item, it should go to a new List Details page. The list name and items should be able to be edited on the list details page. The users lists should show in a left navgiation itself on the homepage, with a link at the top to "Manage Lists". Each list item should be clickable, and go to that List's Details page.

When clicking the details for a move, or actor, or director, it should navigate to that item's Details page, and show all of the information it can find from the backend api query. If any moves are listed on the details pages, then clicking it should navigate to that movie's Details page.

All service classes and calls to the backend can be cached on the frontend in IndexedDB or something more appropriate for storing the JSON responses. The cache can utilize a hash of the requests' different query parameters to create a unique key for each.

The Actor details page should show information such as:
-Simple metadata (name, date of birth and death, birth town or country).
-Biography, if available.
-Movies the actor was in, sorted by rating. Also show the year of the movie, and its rating.

The Director details page should show:
-Simple metadata (name, date of birth and death, birth town or country).
-Biography, if available.
-Movies the director made, sorted by rating. Also show the year of the movie, and its rating.




TODO: Write a script to import third-party movie, actor, and                                                        director databases into our internal postgres database, that is indexed as fast as possible. As much data for each movie, actor, andire dctor should be downloaded and stored in the interal database, but at least the title, year, director, rating, genre, country it was made or filmed in, general synopsis, and the main character and actor list should be included and stored. For the actors and directors, similarly

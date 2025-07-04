This file describes the basic architecture of the application, separated by Frontend (the React app in the root app folder), and Backend (the fastify app in the root api folder). If any other requirements are required, they are listed under "Other:" at the bottom, and should also be implemented.

Frontend:
-Utilize a frontend cache such as IndexedDB for all backend API requests. The API requests should be cached by a hashed key generated from the api endpoint name and unique request parameters, sorted by name so that the hashes will be the same if the parameters are in a different order but the same values. The parameters could be get parameters or a post JSON body, and it should support unique hashing of either. The services should utilize the frontend cache, if it is enabled, and if a hashed key exists in the cache for that request, then it should serve that data instead of needing to go to the backend api for it.
-Use material UI with support for light and dark mode, stored within User settings.
-Use a common banner across all pages, and wrap the Application Shell in Suspense component while it loads the backend data. Also wrap the application in an ErrorBoundary component that will show any frontend errors if any occur.
-There should be a left sidebar which has common navigation items such as Movies, Actors, Directors, Lists, and "Recommend a Movie" links. Each of these links should go to their own route page compents.
-Use react-router and create separate components for each page. Each should be hosted inside the Application Shell.
-The basic routes should use "slugs" for the detail pages for the movies, directors, and actors, or their ids if no slug exists. The slugs should be generated from the movie name, and its year (ie. Gladitor 2022 should be "movies/gladiator-2022"), or the person's name (ie. Alan Rickman should be '/actors/alan-rickman'). Otherwise they use IDs and can be referred to from the main route, such as "/movies?imdb_id=<IMDB_MOVIE_ID>" or "/directors?tmdb_id=<TMDB_PERSON_ID> or "/directors?imdb_id=<IMDB_PERSON_ID>", and so on.

Backend:
-use latest fastify
-setup to allow CORS from any origin.
-generate swagger documentation for the fastify api routes.
-ensure all api controller routes use js-doc style documentation.

Other:
-document all methods at a basic level
-both frontend and backend projects should include a command to generate a frontend static build of documentation, using a popular documentation rendering library that preferably supports js-doc and others, and lists out the class structure and their methods, and how they are used together. The generated documentation should be put in a separate folder called docs within each project.
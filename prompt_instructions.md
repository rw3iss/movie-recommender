Introduction:
This repository hosts all of the current files for the custom application you are helping to design and complete.

In the _requirements folder are multiple files that will list specific requirements of this application.
Any special requirements for the application architecture or technology stack for both the frontend app and backend api will be mentioned in the file "architecture.md" under the _requirements folder, if it exists. Otherwise always use Typescript with either React or fastify.

Any code created should be fully working Typescript, using well-architected patterns, and preferably S.O.L.I.D. principles whenever possible. It should be enterprise-grade code, but the syntax should be kept as brief as possible.
Comments should be included but only to describe complex operations.

Any API methods should include js-doc /** style block comments above it.

If the application requires a frontend, that frontend should be written in the latest React version. If the application requires a backend, it should be written in the latest fastify version, use postgres as the database, and redis as a cache, if needed.

A docker-compose.yaml file should exist in the main directory, and be setup to start the postres, redis, and frontend app instances.

If any classes or files become larger than 500 lines, please try to break them out to multiple classes or modules, or use helper or utility files.

Before you start outputting all of the code, first ensure a readme.md is created in both the api and app directories, that lists that project's directory and file structure, and a very basic overview of how that application works. You can modify this list if you need to add files later. You can also put the overview of the advanced features used in the applications in the readme.md files as well, such as how that feature works or how it improves the application.
After you are done generating the code for any and every given prompt that I send, then you should go back and read this full filelist from the readme.md for that project, and make sure that all of the assets have been generated for that project, if you didn't generate the file or modify it already, or if it doesn't exist. Be sure to generate all necessary and imported files in the code that you create, or that the code in this package references. Generate or import and missing code.
For the backend api readme.md file, describe how the API endpoints can be used, and refer to a swagger api endpoint if the architecture requirements mentions to use swagger.

For any files that are currently missing or incomplete in the uploaded repository package, then you should generate them as a result.

If the context becomes too slow or pauses, then you should automatically enter the "Continue" prompt without my intervention.
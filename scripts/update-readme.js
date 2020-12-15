const path             = require( 'path' );
const { promises: fs } = require( 'fs' );

const got               = require( 'got' );
const numeral           = require( 'numeral' );
const LightMap          = require( '@mi-sec/lightmap' );
const { GraphQLClient } = require( 'graphql-request' );

const rootPath = path.join( __dirname, '..' );

( async () => {
	const stackExchangeResponse = await got( 'https://api.stackexchange.com/2.2/users/4863783', {
		responseType: 'json',
		searchParams: {
			key: process.env.STACK_EXCHANGE_KEY,
			site: 'stackoverflow',
			order: 'desc',
			sort: 'reputation',
			filter: 'default'
		}
	} );

	const [ { link, reputation } ] = stackExchangeResponse.body.items;

	const gitHubClient = new GraphQLClient( 'https://api.github.com/graphql', {
		headers: {
			Authorization: `bearer ${ process.env.GH_ACCESS_TOKEN }`
		},
		method: 'POST'
	} );

	const gitHubResponse = await gitHubClient.request( `
		{
			viewer {
				login
				repositories(privacy: PUBLIC, ownerAffiliations: OWNER, isFork: false) {
					totalCount
				}
			}
		}
	` );

	const { viewer: { repositories } } = gitHubResponse;

	const template = await fs.readFile( path.join( rootPath, './README.template.md' ), 'utf-8' );

	const output = template.replace( new LightMap( [
		[ /{{so_link}}/g, link ],
		[ /{{so_reputation}}/g, numeral( reputation ).format( '0.0a' ) ],
		[ /{{gh_repos_count}}/g, repositories.totalCount ]
	] ) );

	await fs.writeFile( path.join( rootPath, './README.md' ), output );
} )();

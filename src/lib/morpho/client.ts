import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const MORPHO_API_URL = "https://api.morpho.org/graphql";

export const morphoClient = new ApolloClient({
  link: new HttpLink({ uri: MORPHO_API_URL }),
  cache: new InMemoryCache(),
});

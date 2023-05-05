import { Response, Request, NextFunction } from "express";
import { Db } from "mongodb";
import { dbQueryFilters } from "../../@types";

export const queryArchive = { 

  search: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {

      const query = req.query as unknown as dbQueryFilters;
      const GtDb: Db = req.app.locals.gtdb;

      function createSearchItem(
        query: string,
        path: string | {wildcard: '*'}
      ){
        return {
          text: {
            query: query,
            path: path 
          }
        };
      };      

      const searchArr = Object.entries(query)
        .filter(([ key, _ ]) => 
          key === 'user_name' ||
          key === 'track_title' ||
          key === 'text' ||
          key === 'link_source' ||
          key === 'entry_contains_text'
        )
        .map(([ key, val ]) => 
          key === 'entry_contains_text'
            ? createSearchItem(val, { wildcard: '*' })
            : key === 'user_name'
            ? createSearchItem(`\"${val}\"`, key) // not sure why this isnt searching exact phrase
            : createSearchItem(val, key)
        );

      const baseSearch = {
          $search: {
              index: 'default',
              compound: {
                  must: searchArr
              },
          },
       };

      const sortBy = 
        query.sort_by === 'reacts' || query.sort_by === 'user_name' 
          ? query.sort_by
          : 'date_posted';

      const sortDir = 
        Number(query.sort_dir) === 1
          ? 1
          : -1;

      const postsPerPage = 15;
      const currPage = (query.page || 0) * postsPerPage;

      const aggSearch = [
        baseSearch,
        {
            $match: {
                link_source: {
                    $exists: true
                }
            }
        },
        {
          $sort: {
            [sortBy]: sortDir
          }
        },
        { $facet: {
            paginatedResults: [
                {
                    $skip: currPage
                },
                {
                    $limit: postsPerPage
                }
            ],
            totalCount: [
                { $count: "count" }
            ]
        }}
      ];

      const posts = GtDb.collection('gt_posts');
      const selectedPosts = await posts
        .aggregate(aggSearch)
        .toArray();

      res.locals.selectedPosts = {
        posts: selectedPosts[0].paginatedResults,
        queryPages: Math.ceil(
            selectedPosts[0].totalCount[0].count / postsPerPage
        ) 
      };

      return next();

    } catch (err){
      return next(`Error querying archive ${err}`);
    }
  },

  
  showUsers: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try{

      const name = req.query.name;
      const GtDb: Db = req.app.locals.gtdb;

      // list users that match query with wildcard in order of posts made
      const aggAutocomplete = {
        $search: {
          index: 'user_name_autocomplete',
          autocomplete: {
            query: `${name}`,
            path: 'user_name'
          }
        }
      };

      const aggGroupUsers = [
        {$group: {
            _id: "$user_name",
            posts: {
              $sum:1
            }
          }
        },
        {$sort: {
            posts: -1
          }
        },
        // {$limit: 20}
      ];

      const posts = GtDb.collection('gt_posts');
      const users = await posts.aggregate(
        name
          ? [aggAutocomplete, ...aggGroupUsers]
          : aggGroupUsers
        )
        .toArray();

      res.locals.users = users;
      return next(); 

    } catch(err) {
      return next(`Error getting user list: ${err}`);
    };
  }
};

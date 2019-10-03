const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeArticlesArray } = require('./articles.fixtures');

describe.only('Articles Endpoints', function() {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.DB_URL_TEST_2
    });
    app.set('db',db);
  });

  after('disconnect from db', () => db.destroy());

  before('clean the table', ()=> db('blogful_articles').truncate());

  afterEach('truncate db',() => db('blogful_articles').truncate());
  

  describe(`GET /articles`,()=> {
    context('Given there are articles in the database', () => {
      const testArticles = makeArticlesArray();
      beforeEach('insert articles', () => {
        return db
          .into('blogful_articles')
          .insert(testArticles);
      });

      it('GET /articles responds with 200 and all the articles',() => {
        return supertest(app)
          .get('/articles')
          .expect(200, testArticles);
      });
    });
    context('Given there are no articles in the database',() => {
      it('GET /articles returns with an empty array',() => {
        return supertest(app)
          .get('/articles')
          .expect(200, []);
      });
    });
  });

  describe(`GET /articles/:article_id`,()=> {
    context(`Given there are articles in the database`,() => {
      const testArticles = makeArticlesArray();
      beforeEach('insert articles', () => {
        return db
          .into('blogful_articles')
          .insert(testArticles);
      });

      it('GET /articles/:article_id responds with a 200 and the appropriate article',()=> {
        const articleId = 2;
        let expected = testArticles[articleId -1];
        return supertest(app)
          .get(`/articles/${articleId}`)
          .expect(200,expected);
      });
    });
    context(`Given there are no articles in the database`, ()=> {
      it('GET /articles/:article_id returns a 404 and the error message we expect',()=> {
        const testId = 123456;
        return supertest(app)
          .get(`/articles/${testId}`)
          .expect(404, {error: {message: `Article doesn't exist`}});
      });
    });
  });

});
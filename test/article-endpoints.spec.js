const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeArticlesArray } = require('./articles.fixtures');

describe('Articles Endpoints', function() {
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

      context(`Given an XSS attack article`, () => {
        const maliciousArticle = {
          id: 911,
          title: 'Naughty naughty very naughty <script>alert("xss");</script>',
          style: 'How-to',
          content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
        };
        
        beforeEach('insert malicious article', () => {
          return db
            .into('blogful_articles')
            .insert([ maliciousArticle ]);
        });
        
        it('removes XSS attack content', () => {
          return supertest(app)
            .get(`/articles/${maliciousArticle.id}`)
            .expect(200)
            .expect(res => {
              expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
              expect(res.body.content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
            });
        });
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

  describe(`POST /articles`, () => {
    it(`creates an article, responding with 201 and the new article`, function() {
      this.retries(3);
      let newArticle = {
        title: 'Test New Article',
        style: 'Listicle',
        content: 'This is the article content. Yay'
      };
      return supertest(app)
        .post('/articles')
        .send(newArticle)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newArticle.title);
          expect(res.body.style).to.eql(newArticle.style);
          expect(res.body.content).to.eql(newArticle.content);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/articles/${res.body.id}`);
          const expected = new Date().toLocaleString('en', { timeZone: 'UTC' });
          const actual = new Date(res.body.date_published).toLocaleString('en', { timeZone: 'UTC' });
          expect(actual).to.eql(expected);
        })
        .then(postRes =>
          supertest(app)
            .get(`/articles/${postRes.body.id}`)
            .expect(postRes.body)
        );
    });

    const requiredFields = ['title', 'style', 'content'];

    requiredFields.forEach(field => {
      const newArticle = {
        title: 'New test article',
        style: 'Listicle',
        content: 'This is content yayy'
      };
      delete newArticle[field]
      it(`responds with a 400 and an error message when the ${field} is missing`,() => {
        return supertest(app)
          .post('/articles')
          .send(newArticle)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });

      });
    });

  });

  describe(`DELETE /article/:article_id`,() => {
    context('Given there are articles in the database blogful',() => {
      let testArticles = makeArticlesArray();
      beforeEach('insert articles', () => {
        return db
          .into('blogful_articles')
          .insert(testArticles);
      });

      it(`responds with a 204 error and deletes the proper article id`,() => {
        let fakeId = 2;
        let expectedToBeGone = testArticles.filter(article => article.id !== fakeId);

        return supertest(app)
          .delete(`/articles/${fakeId}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/articles`)
              .expect(expectedToBeGone)
          );
      });
    });

    context('Given there are no articles in the database',() => {
      it(`responds with a 404 error`, () => {
        let fakeId = 10;
        return supertest(app)
          .delete(`/articles/${fakeId}`)
          .expect(404, { error: { message: `Article doesn't exist` } });
      });
    });
  });
});
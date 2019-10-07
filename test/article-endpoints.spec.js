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
  

  describe(`GET /api/articles`,()=> {
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
            .get(`/api/articles/${maliciousArticle.id}`)
            .expect(200)
            .expect(res => {
              expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
              expect(res.body.content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
            });
        });
      });

      it('GET /api/articles responds with 200 and all the articles',() => {
        return supertest(app)
          .get('/api/articles')
          .expect(200, testArticles);
      });
    });
    context('Given there are no articles in the database',() => {
      it('GET /api/articles returns with an empty array',() => {
        return supertest(app)
          .get('/api/articles')
          .expect(200, []);
      });
    });
  });

  describe(`GET /api/articles/:article_id`,()=> {
    context(`Given there are articles in the database`,() => {
      const testArticles = makeArticlesArray();
      beforeEach('insert articles', () => {
        return db
          .into('blogful_articles')
          .insert(testArticles);
      });

      it('GET /api/articles/:article_id responds with a 200 and the appropriate article',()=> {
        const articleId = 2;
        let expected = testArticles[articleId -1];
        return supertest(app)
          .get(`/api/articles/${articleId}`)
          .expect(200,expected);
      });
    });
    context(`Given there are no articles in the database`, ()=> {
      it('GET /api/articles/:article_id returns a 404 and the error message we expect',()=> {
        const testId = 123456;
        return supertest(app)
          .get(`/api/articles/${testId}`)
          .expect(404, {error: {message: `Article doesn't exist`}});
      });
    });
  });

  describe(`POST /api/articles`, () => {
    it(`creates an article, responding with 201 and the new article`, function() {
      this.retries(3);
      let newArticle = {
        title: 'Test New Article',
        style: 'Listicle',
        content: 'This is the article content. Yay'
      };
      return supertest(app)
        .post('/api/articles')
        .send(newArticle)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newArticle.title);
          expect(res.body.style).to.eql(newArticle.style);
          expect(res.body.content).to.eql(newArticle.content);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/api/articles/${res.body.id}`);
          const expected = new Date().toLocaleString('en', { timeZone: 'UTC' });
          const actual = new Date(res.body.date_published).toLocaleString('en', { timeZone: 'UTC' });
          expect(actual).to.eql(expected);
        })
        .then(postRes =>
          supertest(app)
            .get(`/api/articles/${postRes.body.id}`)
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
          .post('/api/articles')
          .send(newArticle)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });

      });
    });

  });

  describe(`DELETE /api/article/:article_id`,() => {
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
          .delete(`/api/articles/${fakeId}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/articles`)
              .expect(expectedToBeGone)
          );
      });
    });

    context('Given there are no articles in the database',() => {
      it(`responds with a 404 error`, () => {
        let fakeId = 10;
        return supertest(app)
          .delete(`/api/articles/${fakeId}`)
          .expect(404, { error: { message: `Article doesn't exist` } });
      });
    });
  });

  describe.only(`PATCH /api/articles/:article_id`, () => {
    context(`Given no articles`, () => {
      it(`responds with 404`, () => {
        const articleId = 123456;
        return supertest(app)
          .patch(`/api/articles/${articleId}`)
          .expect(404, { error: { message: `Article doesn't exist` } })
      });
    });

    context('Given there are articles in the database', () => {
      const testArticles = makeArticlesArray();
      
      beforeEach('insert articles', () => {
        return db
          .into('blogful_articles')
          .insert(testArticles);
      });
      
      it('responds with 204 and updates the article', () => {
        const idToUpdate = 2;
        const updateArticle = {
          title: 'updated article title',
          style: 'Interview',
          content: 'updated article content',
        };
        const expectedUpdate = {
          ...testArticles[idToUpdate - 1],
          ...updateArticle
        };
        return supertest(app)
          .patch(`/api/articles/${idToUpdate}`)
          .send(updateArticle)
          .expect(204)
          .then(res => 
            supertest(app)
          .get(`/api/articles/${idToUpdate}`)
          .expect(expectedUpdate))
      });

      it(`responds with 400 when no required fields supplied`, () => {
             const idToUpdate = 2
             return supertest(app)
               .patch(`/api/articles/${idToUpdate}`)
               .send({ irrelevantField: 'foo' })
               .expect(400, {
                 error: {
                   message: `Request body must contain either 'title', 'style' or 'content'`
                 }
               })
            })

            it(`responds with 204 when updating only a subset of fields`, () => {
                    const idToUpdate = 2
                    const updateArticle = {
                      title: 'updated article title',
                    }
                    const expectedArticle = {
                      ...testArticles[idToUpdate - 1],
                      ...updateArticle
                    }
              
                    return supertest(app)
                      .patch(`/api/articles/${idToUpdate}`)
                      .send({
                        ...updateArticle,
                        fieldToIgnore: 'should not be in GET response'
                      })
                      .expect(204)
                      .then(res =>
                        supertest(app)
                          .get(`/api/articles/${idToUpdate}`)
                          .expect(expectedArticle)
                      )
                  });
                });
    });
  });
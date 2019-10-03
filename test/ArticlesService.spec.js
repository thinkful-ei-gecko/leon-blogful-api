let knex = require('knex');
let ArticlesService = require('../src/ArticlesService');

describe('Articles Service', () => {

  let fakeData = [
    {
      id: 1,
      date_published: new Date('2029-01-22T16:28:32.615Z'),
      title: 'First post!', 
      style: 'Interview',
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Natus consequuntur deserunt commodi, nobis qui inventore corrupti iusto aliquid debitis unde non. Adipisci, pariatur. Molestiae, libero esse hic adipisci autem neque?'
    },
    {
      id: 2,
      date_published: new Date('2029-01-22T16:28:32.615Z'),
      title:'Second post!', 
      style:'How-to',
      content: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum, exercitationem cupiditate dignissimos est perspiciatis, nobis commodi alias saepe atque facilis labore sequi deleniti. Sint, adipisci facere! Velit temporibus debitis rerum.'
    },
    {
      id: 3,
      date_published: new Date('2029-01-22T16:28:32.615Z'),
      title: 'Third post!',
      style: 'News',
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, voluptate? Necessitatibus, reiciendis? Cupiditate totam laborum esse animi ratione ipsa dignissimos laboriosam eos similique cumque. Est nostrum esse porro id quaerat.'
    }
  ];

  let db = knex({
    client: 'pg',
    connection: process.env.DB_URL_TEST
  });

  before(() => db('blogful_articles').truncate() );
  after(() => db.destroy());

  context('there is data in the blogful table', () => {

    beforeEach(() => db.insert(fakeData).into('blogful_articles'));
    afterEach(() => db('blogful_articles').truncate());

    it('getArticles() shows all its data', () => {
      return ArticlesService.getArticles(db)
        .then(data => {
          expect(data).to.eql(fakeData);
        });
    });

    it('findById() shows an item by its ID',() => {
      let id = 3;
      let expected = fakeData[id-1];
      return ArticlesService.findById(db,id)
        .then(data => {
          expect(data).to.eql(expected);
        });
    });

    it('updateArticle() updates an item by its ID',() => {
      let id = 3;
      let updateInfo = {
        title: 'This is a new title',
        content: 'This is the newest content!!!'
      };
      return ArticlesService.updateArticle(db,id,updateInfo)
        .then(() => ArticlesService.findById(db,id))
        .then(returned => {
          expect(returned).to.eql({
            ...fakeData[id-1],
            ...updateInfo
          });
        });
    });

    it('deleteArticle() deletes an item by its ID', () => {
      let id = 2;
      return ArticlesService.deleteArticle(db,id) 
        .then(() => ArticlesService.getArticles(db))
        .then(data => {
          let expected = fakeData.filter(item => item.id !== id)
          expect(expected).to.eql(data);
        });
    });


  });

  context('there is no data in the blogful table',() => {

    before(() => db('blogful_articles').truncate());
    it('getArticles() shows no data', () => {
      return ArticlesService.getArticles(db)
        .then(data => {
          expect(data).to.eql([]);
        });
    });

    it('createArticle() creates a new article',() => {
      let newArticle = {
        id: 4,
        date_published: new Date('2029-01-22T16:28:32.615Z'),
        title: 'Fourth post!',
        style: 'Interview',
        content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, voluptate? Necessitatibus, reiciendis? Cupiditate totam laborum esse animi ratione ipsa dignissimos laboriosam eos similique cumque. Est nostrum esse porro id quaerat.'
      };
      return ArticlesService.createArticle(db,newArticle)
        .then(data => {
          expect(data[0]).to.eql(newArticle);
        });
    });
  });

});
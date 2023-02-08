require("dotenv").config();
const fs = require("fs");
const path = require("path");
const request = require("supertest");
const { expect } = require("chai");
const api = require("../index.js");
const dateNow = Date.now();
const jsonPath = path.join(__dirname, "..", process.env.BASE_JSON_PATH);

before(async () => {
  const defaultTodos = [
    {
      id: "01507581-9d12-a4c4-06bb-19d539a11189",
      name: "Learn to use Adobe Photoshop",
      completed: true,
    },
    {
      id: "19d539a11189-bb60-u663-8sd4-01507581",
      name: "Buy 2 Cartons of Milk",
      completed: true,
    },
    {
      id: "19d539a11189-4a60-3a4c-4434-01507581",
      name: "Learn to juggle",
      completed: false,
    },
    {
      id: "7895as2s4c-4a60-3a4c-7acc-895as1cc85",
      name: "Renew Passport",
      completed: false,
    },
  ];

  defaultTodos.forEach((todo, i) => {
    const due = new Date(dateNow);

    due.setUTCDate(due.getUTCDate() + (i + 2 - defaultTodos.length) * 7);
    todo.due = due.toISOString();
    due.setUTCDate(due.getUTCDate() - 7);
    todo.created = due.toISOString();
  });
  await fs.writeFile(
    jsonPath,
    JSON.stringify(defaultTodos, null, 2) + "\n",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
    }
  );
});

describe("GET /", function () {
  let path = "/";
  it("should be listening and respond with the content type set to text/html", () => {
    return request(api)
      .get(path)
      .expect("Content-Type", /text\/html/)
      .expect(200);
  });
});

describe("GET /todos", async function () {
  let path = "/todos";
  it("should be listening and respond with the content type set to application/json", async () => {
    await request(api)
      .get(path)
      .expect("Content-Type", /application\/json/)
      .expect(200);
  });

  it("should return array of all todos", async () => {
    await request(api)
      .get(path)
      .expect((res) => {
        expect(res.body).to.be.an("array");
      });
  });
});

describe("GET /todos/overdue", function () {
  let path = "/todos/overdue";
  it("should be listening and respond with the content type set to application/json", async () => {
    await request(api)
      .get(path)
      .expect("Content-Type", /application\/json/)
      .expect(200);
  });

  it("should return array of overdue todos", async () => {
    await request(api)
      .get(path)
      .expect((res) => {
        let overdues = [...new Set(res.body)];
        overdues.forEach(function (overdue, index) {
          expect(new Date(overdue.due) < dateNow);
        });
      });
  });
});

describe("GET /todos/completed", function () {
  let path = "/todos/completed";
  it("should be listening and respond with the content type set to application/json", async () => {
    await request(api).get(path).expect("Content-Type", /application\/json/).expect(200);
  });

  it("should return array of completed todos", async () => {
    await request(api)
      .get(path)
      .expect((res) => {
        let completed = [...new Set(res.body)];
        completed.forEach(function (todo) {
          expect(todo.completed).to.be.true;
        });
      });
  });
});

describe("POST /todos", function () {
  let path = "/todos";

  it("should return status 201 (Created)", async () => {
    await request(api)
      .post(path)
      .send({
        name: "Turn on central heating",
        due: new Date("30 December 2021 14:48").toISOString(),
      })
      .expect(201);
  });

  it("should contain newly created todo: 'Turn on central heating'", async () => {
    await request(api)
      .get(path)
      .expect((res) => {
        let todos = [...new Set(res.body)].filter((todo) => {
          return todo.name === "Turn on central heating";
        });
        expect(
          todos,
          "Multiple todos with name 'Turn on central heating'. Expected only one"
        ).to.have.lengthOf(1);
        expect(todos[0], "Missing property 'created'").to.have.property(
          "created"
        );
        expect(todos[0], "Missing property 'completed'").to.have.property(
          "completed"
        );
      });
  });

  it("should return status 400 (Bad Request) when invalid todo is sent", async () => {
    await request(api)
      .post(path)
      .send({ jibberish: "Should not work" })
      .expect(400);
  });
});

describe("PATCH /todos:id", function () {
  let path = "/todos";

  it("should update/patch and return status 200 (OK)", async () => {
    await request(api)
      .patch(path + "/19d539a11189-bb60-u663-8sd4-01507581")
      .send({ name: "Buy 6 Cartons of Milk" })
      .expect(200);
  });

  it("should contain the patched todo: 'Buy 6 Cartons of Milk'", async () => {
    await request(api)
      .get(path)
      .expect((res) => {
        let todos = [...new Set(res.body)].filter((todo) => {
          return todo.name === "Buy 6 Cartons of Milk";
        });
        expect(
          todos,
          "None or multiple todos with name 'Buy 6 Cartons of Milk'. Expected only one"
        ).to.have.lengthOf(1);
      });
  });
});

describe("POST /todos/:id/complete", function () {
  let path = "/todos";

  it("should successfully COMPLETE  task with id '19d539a11189-bb60-u663-8sd4-01507581' and return status 200 (OK)", async () => {
    await request(api)
      .post(path + "/19d539a11189-bb60-u663-8sd4-01507581/complete")
      .send()
      .expect(200);
  });

  it("should contain COMPLETED todo with id '19d539a11189-bb60-u663-8sd4-01507581'", async () => {
    await request(api)
      .get(path + "/completed")
      .expect((res) => {
        let todos = [...new Set(res.body)].filter((todo) => {
          return (
            todo.id === "19d539a11189-bb60-u663-8sd4-01507581" && todo.completed
          );
        });
        expect(
          todos,
          "None or multiple todos with id '19d539a11189-bb60-u663-8sd4-01507581'. Expected only one"
        ).to.have.lengthOf(1);
      });
  });
});

describe("POST /todos/:id/undo", function () {
  let path = "/todos";

  it("should successfully UNDO task with id '01507581-9d12-a4c4-06bb-19d539a11189' and return status 200 (OK)", async () => {
    await request(api)
      .post(path + "/01507581-9d12-a4c4-06bb-19d539a11189/undo")
      .send()
      .expect(200);
  });

  it("should return 400 (Bad Request) when invalid id is sent to undo", async () => {
    await request(api)
      .post(path + "/0xxx1235/undo")
      .send()
      .expect(400);
  });

  it("should contain INCOMPLETE todo with id '01507581-9d12-a4c4-06bb-19d539a11189'", async () => {
    await request(api)
      .get(path)
      .expect((res) => {
        let todos = [...new Set(res.body)].filter((todo) => {
          return (
            todo.id === "01507581-9d12-a4c4-06bb-19d539a11189" &&
            todo.completed == false
          );
        });
        expect(
          todos,
          "None or multiple todos with id '01507581-9d12-a4c4-06bb-19d539a11189'. Expected only one"
        ).to.have.lengthOf(1);
      });
  });
});

describe("DELETE /todos/:id", function () {
  let path = "/todos";

  it("should successfully DELETE task 'Learn to juggle' by id and return status 200 (OK)", async () => {
    await request(api)
      .delete(path + "/19d539a11189-4a60-3a4c-4434-01507581")
      .expect(200);
  });

  it("should NOT CONTAIN any todo with name 'Learn to juggle', id '19d539a11189-4a60-3a4c-4434-01507581'", async () => {
    await request(api)
      .get(path)
      .expect((res) => {
        let todos = [...new Set(res.body)];
        todos = todos.filter((todo) => {
          todo.id === "19d539a11189-4a60-3a4c-4434-01507581";
        });
        expect(
          todos,
          "None or multiple todos with name 'Learn to juggle', id '19d539a11189-4a60-3a4c-4434-01507581'. Expected only one"
        ).to.have.lengthOf(0);
      });
  });

  it("should return 400 (Bad Request) when invalid id is sent to DELETE", async () => {
    await request(api)
      .delete(path + "/xxx123")
      .expect(400);
  });
});

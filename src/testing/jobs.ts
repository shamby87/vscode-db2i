import assert from "assert";
import { TestSuite } from ".";
import { commands } from "vscode";
import { JobManager } from "../config";
import { SQLJobManager } from "../connection/manager";
import { SQLJob } from "../connection/sqlJob";
import { getInstance } from "../base";

export const JobsSuite: TestSuite = {
  name: `Connection tests`,
  tests: [
    {name: `Backend check`, test: async () => {
      const backendInstalled = await SQLJobManager.hasBackendServer();
  
      // To run these tests, we need the backend server. If this test fails. Don't bother
      assert.strictEqual(backendInstalled, true);
    }},

    {name: `Creating a job`, test: async () => {
      const newJob = new SQLJob();

      assert.strictEqual(newJob.jobId, undefined);

      await newJob.connect();

      assert.notStrictEqual(newJob.jobId, undefined);

      await newJob.close();
    }},

    {name: `Jobs have different job IDs`, test: async () => {
      const jobA = new SQLJob();
      const jobB = new SQLJob();

      await jobA.connect();
      await jobB.connect();

      assert.notStrictEqual(jobA.jobId, jobB.jobId);

      await jobA.close();
      await jobB.close();
    }},

    {name: `Job can run many queries`, test: async () => {
      const newJob = new SQLJob();

      await newJob.connect();

      const resultA = await newJob.query(`values (job_name, current_timestamp)`);
      const resultB = await newJob.query(`values (job_name, current_timestamp)`);

      assert.strictEqual(resultA[0][`00001`], resultB[0][`00001`]);

      newJob.close();
    }},

    {name: `Library list is used`, test: async () => {
      let newJob = new SQLJob({libraries: [`QSYS`, `SYSTOOLS`], naming: `system`});
      await newJob.connect();

      try {
        await newJob.query(`select * from qcustcdt`);
        assert.fail(`Query should not have worked. Library list issue`);
      } catch (e) {
        assert.notStrictEqual(e.message, undefined);
      }

      newJob.close();

      newJob = new SQLJob({libraries: [`QSYS`, `QIWS`], naming: `system`});
      await newJob.connect();

      const rows = await newJob.query(`select * from qcustcdt`);
      assert.notStrictEqual(rows.length, 0);

      newJob.close();
    }},

    {name: `Ensure API compatability`, test: async () => {
      const instance = getInstance();
      const content = instance.getContent();

      const newJob = new SQLJob({naming: `sql`});
      await newJob.connect();

      const query = `select * from qiws.qcustcdt`;
      const rowsA = await newJob.query(query);
      const rowsB = await content.runSQL(query);

      newJob.close();

      assert.deepStrictEqual(rowsA, rowsB);
    }},

    {name: `Performance measuring`, test: async () => {
      const instance = getInstance();
      const content = instance.getContent();

      const newJob = new SQLJob({naming: `sql`});
      await newJob.connect();

      const query = `select * from qiws.qcustcdt`;

      console.log(`Using: ${query}`);

      const ns = performance.now();
      await newJob.query(query);
      await newJob.query(query);
      await newJob.query(query);
      const ne = performance.now();

      console.log(`New query method took ${ne - ns} milliseconds.`);

      newJob.close();

      const os = performance.now();
      await content.runSQL(query);
      await content.runSQL(query);
      await content.runSQL(query);
      const oe = performance.now();

      console.log(`Old query method took ${oe - os} milliseconds.`);
    }},
  ]
}
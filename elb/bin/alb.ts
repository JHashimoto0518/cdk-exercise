#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AlbStack } from '../lib/alb-stack';
import { SimpleAlbStack } from '../lib/simple-alb-stack';

const app = new cdk.App();
// new AlbStack(app, 'AlbStack', {
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION
//   }
// });
new SimpleAlbStack(app, 'SimpleAlbStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
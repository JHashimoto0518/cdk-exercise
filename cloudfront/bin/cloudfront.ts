#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CloudfrontStack } from '../lib/cloudfront-stack';
import { CloudfrontComplexStack } from '../lib/cloudfront-complex-stack';

const app = new cdk.App();
// new CloudfrontStack(app, 'CloudfrontStack', {});
new CloudfrontComplexStack(app, 'CloudfrontComplexStack', {});
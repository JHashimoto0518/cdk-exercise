#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CodepipelineStack } from '../lib/codepipeline-stack';
import { CodeBuildStack } from '../lib/codebuild-stack';

const app = new cdk.App();
new CodepipelineStack(app, 'CodepipelineStack', {});
new CodeBuildStack(app, 'CodeBuildStack', {});
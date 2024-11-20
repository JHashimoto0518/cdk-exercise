#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Web3TierStack } from '../lib/web-3tier-stack';

const app = new cdk.App();
new Web3TierStack(app, 'Web3TierStack', {});

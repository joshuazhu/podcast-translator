#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { PTStack } from "../lib/pt-stack";

const app = new cdk.App();
new PTStack(app, "PTStack", "podcast-translator-dev");

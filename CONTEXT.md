# Tiny Internet

A tiny web platform you build by hand and run across three machines.
This file is the glossary for the platform and for the build path that produces it.

## Platform

**Node**:
A machine in the cluster.
The three nodes are ALPHA, BRAVO, and CHARLIE.
_Avoid_: server, host, box, instance

**ALPHA**:
The node that starts as DNS resolver and Load balancer.
_Avoid_: dns-node, gateway node

**BRAVO**:
A web backend node.
_Avoid_: web-1, backend-1

**CHARLIE**:
The other web backend node.
_Avoid_: web-2, backend-2

**pi.world**:
The site the platform serves, about the platform itself.
It is also the DNS zone ALPHA answers for (`pi.world`, `alpha.pi.world`, `bravo.pi.world`, `charlie.pi.world`).
_Avoid_: the app, the demo, the website (when you mean this product)

## Build path

**Layer**:
A band of stages that unlock one class of platform capability.
The five layers are Networking fundamentals, Traffic, Caching and shared state, Observability, and Data and storage.
Stage 0 · Network sits outside the layers.
_Avoid_: module, unit, chapter

**DNS resolver**:
The stage that makes cluster names work.
ALPHA answers authoritatively for `pi.world`.
It does not recurse or forward until a later Enables fact needs that.
_Avoid_: Naming (when you mean this stage), recursive resolver

**Load balancer**:
The stage that makes `pi.world` one public entry on ALPHA and keeps serving it when a backend node dies.
_Avoid_: Front door, reverse proxy, API gateway (when you mean this stage)

**Skip**:
Leave a stage unbuilt when its Enables line is already true on the real machines.
_Avoid_: optional, later, stretch

**Stage**:
One capability the platform gains.
A stage is done when its Enables line is true on real machines.
_Avoid_: project, exercise, lesson (when you mean a stage)

**Enables**:
The platform fact that justifies a stage.
If a stage has no Enables line, it does not belong on the path yet.
_Avoid_: learning objective, motivation

**Step**:
One sitting-sized build increment inside a stage.
A step is done when its Samples reproduce.
Approachability comes from more small Steps, not from Substeps.
_Avoid_: task, exercise, substage, sitting (when you mean a Step)

**Substep**:
An optional named heading under a Step, used only when that Step must stay one Check list but is too big to read as a single block.
Not the sitting-sized unit. A sitting is a Step.
_Avoid_: check, sample (those are not headings)

**Shape**:
The abstract input and output of a step (types and fields, not a concrete instance).
_Avoid_: inputs and outputs (when you mean a Sample), schema, interface

**Sample**:
One concrete input and its expected observable output.
Wire-format lessons use an oracle (bytes or a decoded object in a fixture).
Behavior lessons use one command and its transcript in the stage markdown.
A Sample never includes an implementation walkthrough.
_Avoid_: example, test, fixture (fixture is where some Samples live, not what they are), inputs and outputs

**Check**:
A done-when claim that maps one-to-one to a Sample.
You tick Checks in the curriculum reader.
_Avoid_: done when (as a vague paragraph), acceptance criterion, test

**Progress**:
The set of ticked Checks in the curriculum reader (browser localStorage).
_Avoid_: progress tracker, issue, checkbox file

**Guided spec**:
The document for a stage: enough to know what to build, why, and how to know it is done, without handing over the design.
_Avoid_: tutorial, assignment, spec (unqualified), solution

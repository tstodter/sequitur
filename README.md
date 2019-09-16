# Composable event-based state machines

## Trying it out
`npm run start`

## What is this?
This is a start at a framework for writing highly-composable state machines.
Each event responder in a machine can (and should be) pure, returning a description
of the effect it wants to have on the system. This effect can be a
[reduction](https://en.wikipedia.org/wiki/Fold_(higher-order_function))
of the state machine from its previous state to a new state, a message to be sent
back into the machine, or the output of a number of effect combinators (like Parallel
for running multiple effects, or Try for running an effect with an error handler).

This project was written for two primary reasons. One, as an experiment in writing
more-composable D3 code, as most code written in D3 is "composed" by putting one
piece of code before/after another. Two, because I wanted to be able to specify
event responders that responded to more than one event. For instance, an responder
that activates on every set of 10 subsequent sensor readings, if you wanted
to monitor a running average. Or, an event responder that activates only when
a player says "yes" to going on that kill-10-goblins quest, but has in the past
already killed 50 goblins and said no to the elf princess Sharlene.

### Status
First draft (working and complete-for-now). Currently displays a WASD-controllable swarm
and exposes a few demonstrative keystrokes (try hitting Enter a few times, or pressing P).

### When was it written?
August 2019 -> now

## Next steps
- Unit tests. They should be _extremely_ easy to write, if the idea is as composable as I think
  it is, but it needs to be done before being battle-tested.
- Library-ize. High priority, if I'm going to test it out on real cases without copy-pasting
  the thing everywhere


---
title: "Complextropy and Complexodynamics - Sutskever Reading List Series (1 of 30)"
date: 2025-06-29
draft: false
---

![banner](/images/coffee-mixing-stages.png)

What exactly is complexity? What is there to model? I've been preoccupied with these ideas recently, especially after exploring Ilya Sutskever's highly recommended top 30 machine learning reading list. This aligns closely with my writing about compression. It's just another way of looking at how to model complex yet intelligent systems — a.k.a. creating ML models or "AI," a term that's overused these days.

Anyway, let's start with a very "simple" concept — entropy. You might have noticed it in my handle, "entropy warrior." What exactly does entropy mean? You can easily find a definition with a quick Google search. Here's what the latest Google AI search function tells us:

> "Entropy is a fundamental concept in physics, particularly in thermodynamics and information theory, that essentially measures the degree of randomness, disorder, or uncertainty within a system. It describes the unavailability of a system's energy to do practical work and the tendency of systems to move towards a state of greater disorder or equilibrium."

I have to say, it's quite a good definition — albeit a bit too wordy for my taste. For me, in the simplest terms, entropy is "randomness." Anti-entropy is "order." A slight digression here: my handle's meaning should be obvious — I want to seek order and meaning from the randomness that we are all inevitably marching towards.

With that out of the way, let's get back to what I want to discuss today — Complexodynamics. What is it exactly? After reading [Scott Aaronson's blog post](https://scottaaronson.blog/?p=762), which I highly recommend, it describes an intuitive but hard-to-define term: "sophistication," "interestingness," or in this tongue-in-cheek blog, "complexodynamics." A picture is worth a thousand words — let's take a look at the banner image above.

From left to right, entropy increases constantly: first, milk and coffee are orderly separated, then they start mixing, creating beautiful and interesting patterns, and finally, they are thoroughly mixed.

But if you take another look at them and try answering this question: "How do you succinctly describe the exact state of the liquid inside the three glasses?" You'll find that the two glasses on the sides are easy, yet the middle one is rather difficult. After all, how can you precisely define that swirly pattern?

This effort required to describe these states is "complextropy." I like the other definition the blogger used: "sophistication." If you think about how complextropy evolves through a time series of coffee and milk mixing, you'll observe the following pattern:

![Complextropy evolution graph](/images/complextropy-evolution.png)

Entropy always increases, but meaningfulness — a.k.a. sophistication, a.k.a. complexity — peaks somewhere along the way.

So what does all this matter? Why should we care? It may not be obvious at first, but I think it's quite deep and brings a new perspective to how we think about building AI/ML systems. Without going too deep into the formalism of defining complextropy rigorously — I highly recommend reading it, especially the part about limiting the definition with tangible compute available — here are my takeaways:

**The Extremes Tell Us Little**

Both extremely random and extremely simple systems, when considered in isolation, have the least amount of useful information. They can be described and modeled easily, yet the models themselves don't provide much utility. To describe how a system evolves, you'll have to observe the dynamics over time — how they change. The most interesting part usually happens somewhere in the middle — the part that gives you insight into the mechanisms behind the complex behavior.

**From States to Mechanisms**

Entropy defines a state, while sophistication defines how much information can be used to deduce the underlying mechanisms — which is arguably the most important part when it comes to machine learning. It's not just about capturing the current configuration; it's about understanding the processes that create and transform these configurations.

**Implications for AI/ML**

This perspective suggests that the most valuable models aren't necessarily those that perfectly capture every detail (maximum entropy) or those that oversimplify (minimum entropy), but those that find the sweet spot where complexity reveals structure. This is where patterns emerge, where we can extract meaningful insights, and where our models become truly intelligent rather than merely descriptive.

As we continue to build more sophisticated AI systems, remembering this principle of complexodynamics might help us focus not just on accuracy or efficiency, but on capturing the meaningful complexity that lies at the heart of intelligent behavior.

---
**Reference:**

1. [Aaronson, S. (2011). Why Philosophers Should Care About Computational Complexity. Shtetl-Optimized Blog.](https://scottaaronson.blog/?p=762)











